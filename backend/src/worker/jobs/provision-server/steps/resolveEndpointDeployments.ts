import { ProtocolCodeSchema } from "@vancloak/api-contract"
import type { ProtocolClient, RemoteServer } from "@vancloak/infrastructure"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import type { EndpointData, EndpointDesiredState } from "@vancloak/infrastructure/shared"
import { ProvisioningError } from "../ProvisioningError.js"
import type { ProvisioningStep } from "./ProvisioningStep.js"

type EndpointDeployment = {
  client: ProtocolClient
  endpointId: string
  placementId: string
  endpointDesiredState: EndpointDesiredState
}

type EndpointDataUpdate = {
  endpointId: string
  endpointData: EndpointData
}

export const resolveEndpointDeployments: ProvisioningStep<
  {
    remoteServer: RemoteServer
    dns: string
    endpoints: {
      endpointId: string
      placementId: string
      port: number
      protocolCode: string
      data: EndpointData | null
    }[]
  },
  { endpointDeployments: EndpointDeployment[]; endpointDataUpdates: EndpointDataUpdate[] }
> = async (serverId, { remoteServer, dns, endpoints }) => {
  const endpointDeployments: EndpointDeployment[] = []
  const endpointDataUpdates: EndpointDataUpdate[] = []

  for (const endpoint of endpoints) {
    const parsedProtocolCode = ProtocolCodeSchema.safeParse(endpoint.protocolCode)
    /* v8 ignore start */
    if (!parsedProtocolCode.success) {
      throw new ProvisioningError(
        serverId,
        "unknown_protocol",
        new Error(
          `Endpoint ${endpoint.endpointId} has unknown protocol "${endpoint.protocolCode}".`,
        ),
      )
    }
    /* v8 ignore stop */

    if (endpoint.data === null) {
      throw new ProvisioningError(
        serverId,
        "invalid_endpoint_data",
        new Error(`Endpoint ${endpoint.endpointId} has invalid data.`),
      )
    }

    const desiredStateSchema = ProtocolRegistry[parsedProtocolCode.data].endpointDesiredStateSchema
    const parsedDesiredState = desiredStateSchema.safeParse(endpoint.data.desiredState)
    if (!parsedDesiredState.success && endpoint.data.desiredState !== undefined) {
      throw new ProvisioningError(
        serverId,
        "invalid_endpoint_desired_state",
        new Error(`Endpoint ${endpoint.endpointId} has invalid desired state.`, {
          cause: parsedDesiredState.error,
        }),
      )
    }

    const client = remoteServer.getProtocolClient(parsedProtocolCode.data)

    let endpointData = endpoint.data
    let endpointDesiredState = parsedDesiredState.success ? parsedDesiredState.data : undefined

    if (!endpointDesiredState) {
      endpointDesiredState = client.createEndpointDesiredState(endpoint.port, dns)
      endpointData = { ...endpointData, desiredState: endpointDesiredState }
      endpointDataUpdates.push({ endpointId: endpoint.endpointId, endpointData })
    }

    endpointDeployments.push({
      client,
      endpointId: endpoint.endpointId,
      placementId: endpoint.placementId,
      endpointDesiredState,
    })
  }

  return { endpointDeployments, endpointDataUpdates }
}
