import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { RemoteServer } from "@vancloak/infrastructure"
import { env } from "@/core/env/index.js"
import { VpnNodeDns } from "./constants/index.js"
import type { ProvisionServerJob } from "@/core/queue/provision-server/index.js"
import { ProvisioningError } from "./ProvisioningError.js"
import { findServer } from "./queries/findServer.js"
import { findActiveEndpoints } from "./queries/findActiveEndpoints.js"
import { findActiveEndpointConfigDatas } from "./queries/findActiveEndpointConfigDatas.js"
import { updateServerData } from "./queries/updateServerData.js"
import { updateEndpointData } from "./queries/updateEndpointData.js"
import { updateServerStatus } from "./queries/updateServerStatus.js"
import { resolveServerDesiredState } from "./steps/resolveServerDesiredState.js"
import { scanSshHostKeys } from "./steps/scanSshHostKeys.js"
import { resolveServerAccess } from "./steps/resolveServerAccess.js"
import { installRequiredSoftware } from "./steps/installRequiredSoftware.js"
import { createServiceUserAccess } from "./steps/createServiceUserAccess.js"
import { hardenSshAccess } from "./steps/hardenSshAccess.js"
import { resolveEndpointDeployments } from "./steps/resolveEndpointDeployments.js"

export async function provisionServerJob(job: ProvisionServerJob) {
  const { serverId } = job

  const server = await findServer(serverId)
  if (!server) throw new ProvisioningError(serverId, "server_not_found")
  if (!server.data) throw new ProvisioningError(serverId, "invalid_server_data")

  if (server.status !== "provisioning") await updateServerStatus(serverId, "provisioning")

  const desiredState = await resolveServerDesiredState(serverId, {
    desiredState: server.data.desiredState,
  })

  let serverData = server.data
  if (server.data.desiredState === undefined) {
    serverData = { ...serverData, desiredState }
    await updateServerData(serverId, serverData)
  }

  if (!serverData.facts?.sshHostKeys?.length) {
    const sshHostKeys = await scanSshHostKeys(serverId, {
      ip: server.ip,
      ssh: serverData.actualState.ssh,
    })
    serverData = { ...serverData, facts: { ...serverData.facts, sshHostKeys } }
    await updateServerData(serverId, serverData)
  }

  const { currentAccess, targetAccess } = await resolveServerAccess(serverId, {
    ip: server.ip,
    serverData,
    appSshPrivateKey: env.APP_SSH_PRIVATE_KEY,
  })

  const authorizedKeys = [await RemoteServer.deriveSshPublicKey(env.APP_SSH_PRIVATE_KEY)]
  if (env.OPERATOR_SSH_PUBLIC_KEY) authorizedKeys.push(env.OPERATOR_SSH_PUBLIC_KEY)

  let remoteServer = new RemoteServer(currentAccess)
  await installRequiredSoftware(serverId, { remoteServer })
  await createServiceUserAccess(serverId, { remoteServer, desiredState, authorizedKeys })
  await hardenSshAccess(serverId, { currentAccess, targetAccess })

  remoteServer = new RemoteServer(targetAccess)
  await remoteServer.assertConnectivity()

  serverData = {
    ...serverData,
    actualState: { ...desiredState, appliedAt: new Date().toISOString() },
  }

  await updateServerData(serverId, serverData)

  const endpoints = await findActiveEndpoints(serverId)
  const { endpointDeployments, endpointDataUpdates } = await resolveEndpointDeployments(serverId, {
    remoteServer,
    host: server.domainName ?? server.ip,
    dns: VpnNodeDns,
    endpoints,
  })

  for (const { endpointId, endpointData } of endpointDataUpdates) {
    await updateEndpointData(endpointId, endpointData)
  }

  for (const { client, endpointId, endpointData, endpointDesiredState } of endpointDeployments) {
    await remoteServer.allowFirewallPort(
      endpointDesiredState.port,
      ProtocolRegistry[client.protocolCode].transportProtocol,
    )

    const configDatas = await findActiveEndpointConfigDatas(endpointId)
    await client.install({ desiredState }, endpointDesiredState, configDatas)

    await updateEndpointData(endpointId, {
      ...endpointData,
      actualState: { ...endpointDesiredState, appliedAt: new Date().toISOString() },
    })
  }

  await updateServerStatus(serverId, "active")
}
