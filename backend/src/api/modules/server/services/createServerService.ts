import type { UpsertServer, Server } from "@vancloak/api-contract"
import { ProtocolCodeSchema } from "@vancloak/api-contract"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { db } from "@/core/database/index.js"
import type { ServiceResult } from "@/core/types/index.js"
import {
  ProvisionServerJobName,
  provisionServerQueue,
} from "@/core/queue/provision-server/index.js"
import { deleteServer } from "../queries/deleteServer.js"
import { findProtocolCodes } from "../queries/findProtocolCodes.js"
import { findServerById } from "../queries/findServerById.js"
import { insertEndpoints } from "../queries/insertEndpoints.js"
import { insertServer } from "../queries/insertServer.js"
import { createServersFromDatabaseData } from "../utils/createServersFromDatabaseData.js"

// Port a freshly created hoster node listens on before provisioning hardens it.
const REMOTE_SERVER_SSH_PORT = 22

type ErrorCode =
  | "credentials_required"
  | "protocol_not_found"
  | "unsupported_protocol"
  | "duplicate_protocol"
  | "enqueue_failed"

export async function createServerService(
  input: UpsertServer,
): Promise<ServiceResult<{ server: Server }, ErrorCode>> {
  const credentials = input.credentials

  if (!credentials) return { ok: false, errorCode: "credentials_required" }

  const endpoints = input.endpoints ?? []

  const result = await db.transaction(
    async (tx): Promise<ServiceResult<{ server: Server }, ErrorCode>> => {
      const protocolCodes = await findProtocolCodes(
        tx,
        endpoints.map((item) => item.protocolId),
      )
      const codeByProtocolId = new Map(
        protocolCodes.map((row) => [row.protocolId, row.protocolCode]),
      )

      const seenProtocolCodes = new Set<string>()
      const endpointsToInsert: { protocolId: string; port: number }[] = []
      for (const item of endpoints) {
        const code = codeByProtocolId.get(item.protocolId)
        if (!code) {
          return {
            ok: false,
            errorCode: "protocol_not_found",
            error: new Error(`Protocol ${item.protocolId} not found.`),
          }
        }

        const parsedCode = ProtocolCodeSchema.safeParse(code)
        if (!parsedCode.success) {
          return {
            ok: false,
            errorCode: "unsupported_protocol",
            error: new Error(`Unsupported protocol "${code}".`),
          }
        }

        if (seenProtocolCodes.has(code)) {
          return {
            ok: false,
            errorCode: "duplicate_protocol",
            error: new Error(
              `Multiple endpoints of protocol "${code}"; one endpoint per protocol is supported.`,
            ),
          }
        }
        seenProtocolCodes.add(code)

        endpointsToInsert.push({
          protocolId: item.protocolId,
          port: item.port ?? ProtocolRegistry[parsedCode.data].defaultPort,
        })
      }

      const [row] = await insertServer(tx, {
        name: input.name,
        domainName: input.domainName ?? null,
        ip: input.ip,
        country: input.country,
        status: "provisioning",
        data: {
          actualState: {
            ssh: {
              type: "password",
              username: credentials.username,
              password: credentials.password,
              port: REMOTE_SERVER_SSH_PORT,
            },
            appliedAt: new Date().toISOString(),
          },
        },
      })

      await insertEndpoints(tx, row.id, endpointsToInsert)

      const rows = await findServerById(tx, row.id)

      return {
        ok: true,
        data: { server: createServersFromDatabaseData(rows)[0] },
      }
    },
  )

  if (!result.ok) return result

  try {
    const queue = provisionServerQueue()
    await queue.add(
      ProvisionServerJobName,
      { serverId: result.data.server.id },
      { jobId: result.data.server.id },
    )
  } catch (error) {
    try {
      await deleteServer(db, result.data.server.id)
    } catch (rollbackError) {
      return {
        ok: false,
        errorCode: "enqueue_failed",
        error: new AggregateError(
          [error, rollbackError],
          "Provision enqueue failed and create rollback failed.",
        ),
      }
    }
    return { ok: false, errorCode: "enqueue_failed", error }
  }

  return result
}
