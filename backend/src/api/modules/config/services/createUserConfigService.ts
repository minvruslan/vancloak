import { sql } from "drizzle-orm"
import type { Config, UpsertConfig } from "@vancloak/api-contract"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { isUserConfigLimitReachedService } from "@/api/modules/config-limit/index.js"
import { db } from "@/core/database/index.js"
import type { ServiceResult } from "@/core/types/index.js"
import { findActiveEndpointById } from "../queries/findActiveEndpointById.js"
import { deleteUserConfigs } from "../queries/deleteUserConfigs.js"
import { getEndpointProtocolClientService } from "./getEndpointProtocolClientService.js"
import { findConfigById } from "../queries/findConfigById.js"
import { findActiveDeviceTypeById } from "../queries/findActiveDeviceTypeById.js"
import { findReservedClientIdentifiers } from "../queries/findReservedClientIdentifiers.js"
import { insertUserConfig } from "../queries/insertUserConfig.js"
import { activateConfig } from "../queries/activateConfig.js"
import { createConfigFromDatabaseData } from "../utils/createConfigFromDatabaseData.js"

type CreatedConfig = Config & { clientConfiguration: string; clientConfigurationLink: string }

type ErrorCode =
  | "endpoint_invalid"
  | "device_type_invalid"
  | "unsupported_protocol"
  | "protocol_options_mismatch"
  | "no_available_ip"
  | "limit_reached"
  | "failed"

export async function createUserConfigService(
  userId: string,
  input: UpsertConfig,
): Promise<ServiceResult<{ config: CreatedConfig }, ErrorCode>> {
  const endpoint = await findActiveEndpointById(db, input.endpointId)
  if (!endpoint) return { ok: false, errorCode: "endpoint_invalid" }

  const deviceType = await findActiveDeviceTypeById(db, input.deviceTypeId)
  if (!deviceType) return { ok: false, errorCode: "device_type_invalid" }

  const resolved = await getEndpointProtocolClientService(endpoint.id)
  if (!resolved.ok) {
    return {
      ok: false,
      errorCode: resolved.errorCode === "unavailable" ? "failed" : resolved.errorCode,
      error: resolved.error,
    }
  }

  const { client, endpointActualState, protocolCode, placementId, host } = resolved.data

  /* v8 ignore start -- unreachable while a single protocol exists: the options union has one branch */
  if (input.protocolOptions && input.protocolOptions.protocolCode !== protocolCode) {
    return {
      ok: false,
      errorCode: "protocol_options_mismatch",
      error: new Error(
        `Config options for protocol "${input.protocolOptions.protocolCode}" do not match endpoint protocol "${protocolCode}".`,
      ),
    }
  }
  /* v8 ignore stop */

  const protocolOptions = {
    ...ProtocolRegistry[protocolCode].configOptionsDefaults,
    ...input.protocolOptions,
  }

  const reserved = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${endpoint.id}))`)

    const limitCheck = await isUserConfigLimitReachedService(
      tx,
      userId,
      ProtocolRegistry[resolved.data.protocolCode].family,
    )

    if (limitCheck.data.limitReached) return "limit_reached" as const

    const reservedClientIdentifiers = await findReservedClientIdentifiers(tx, endpoint.id)

    const clientIdentifier = client.allocateClientIdentifier(
      endpointActualState,
      reservedClientIdentifiers,
    )

    if (!clientIdentifier) return "no_available_ip" as const

    const [row] = await insertUserConfig(tx, {
      userId,
      endpointId: input.endpointId,
      placementId,
      deviceTypeId: input.deviceTypeId,
      name: input.name,
      host,
      data: client.createInitialConfigData(clientIdentifier, protocolOptions),
      clientIdentifier,
    })

    return { configId: row.id, clientIdentifier }
  })

  if (typeof reserved === "string") return { ok: false, errorCode: reserved }

  const { configId, clientIdentifier } = reserved

  let created
  try {
    created = await client.createAccess(
      endpointActualState,
      clientIdentifier,
      protocolOptions,
      endpoint.serverName,
      host,
    )

    const [activated] = await activateConfig(db, configId, created.configData)
    if (!activated) {
      throw new Error(`Config ${configId} was deleted while being created; access rolled back.`)
    }
  } catch (error) {
    try {
      await client.deleteAccessByClientIdentifier(endpointActualState, clientIdentifier)
    } catch (rollbackError) {
      return {
        ok: false,
        errorCode: "failed",
        error: new AggregateError(
          [error, rollbackError],
          "Access create failed and rollback delete failed; peer may be left on server.",
        ),
      }
    }

    await deleteUserConfigs(db, userId, [configId], "pending")

    return { ok: false, errorCode: "failed", error }
  }

  const rows = await findConfigById(db, configId)
  const config = createConfigFromDatabaseData(rows[0])

  return {
    ok: true,
    data: {
      config: {
        ...config,
        data: created.configData,
        clientConfiguration: created.clientConfiguration,
        clientConfigurationLink: created.clientConfigurationLink,
      },
    },
  }
}
