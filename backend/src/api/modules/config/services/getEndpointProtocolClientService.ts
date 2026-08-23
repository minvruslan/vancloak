import type { ProtocolCode } from "@vancloak/api-contract"
import { ProtocolCodeSchema } from "@vancloak/api-contract"
import type { EndpointActualState } from "@vancloak/infrastructure/shared"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import type { ProtocolClient } from "@vancloak/infrastructure"
import { RemoteServer } from "@vancloak/infrastructure"
import { db } from "@/core/database/index.js"
import { env } from "@/core/env/index.js"
import type { ServiceResult } from "@/core/types/index.js"
import { findEndpointProtocolClientData } from "../queries/findEndpointProtocolClientData.js"

type EndpointProtocolClient = {
  client: ProtocolClient
  endpointActualState: EndpointActualState
  protocolCode: ProtocolCode
}

type ErrorCode = "unavailable" | "unsupported_protocol"

export async function getEndpointProtocolClientService(
  endpointId: string,
): Promise<ServiceResult<EndpointProtocolClient, ErrorCode>> {
  const endpointProtocolClientData = await findEndpointProtocolClientData(db, endpointId)
  if (!endpointProtocolClientData) {
    return {
      ok: false,
      errorCode: "unavailable",
      error: new Error(`Endpoint ${endpointId} not found.`),
    }
  }

  const parsedCode = ProtocolCodeSchema.safeParse(endpointProtocolClientData.protocolCode)
  if (!parsedCode.success) {
    return {
      ok: false,
      errorCode: "unsupported_protocol",
      error: new Error(
        `Endpoint ${endpointId} has unsupported protocol "${endpointProtocolClientData.protocolCode}".`,
      ),
    }
  }

  const serverData = endpointProtocolClientData.serverData
  if (!serverData) {
    return {
      ok: false,
      errorCode: "unavailable",
      error: new Error(`Endpoint ${endpointId} server has no valid data.`),
    }
  }

  const serverAccess = RemoteServer.buildServerAccessFromActualState(
    { ip: endpointProtocolClientData.serverIp, data: serverData },
    env.APP_SSH_PRIVATE_KEY,
  )
  if (!serverAccess) {
    return {
      ok: false,
      errorCode: "unavailable",
      error: new Error(`Endpoint ${endpointId} server has no usable access.`),
    }
  }

  const endpointActualState = ProtocolRegistry[parsedCode.data].endpointActualStateSchema.safeParse(
    endpointProtocolClientData.endpointData?.actualState,
  )
  if (!endpointActualState.success) {
    return {
      ok: false,
      errorCode: "unavailable",
      error: new Error(`Endpoint ${endpointId} has no valid actual state.`, {
        cause: endpointActualState.error,
      }),
    }
  }

  const client = new RemoteServer(serverAccess).getProtocolClient(parsedCode.data)

  return {
    ok: true,
    data: {
      client,
      endpointActualState: endpointActualState.data,
      protocolCode: parsedCode.data,
    },
  }
}
