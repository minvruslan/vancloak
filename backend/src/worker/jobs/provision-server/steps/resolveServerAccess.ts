import { RemoteServer } from "@vancloak/infrastructure"
import type { ServerAccess, ServerData } from "@vancloak/infrastructure/shared"
import { ProvisioningError } from "../ProvisioningError.js"
import type { ProvisioningStep } from "./ProvisioningStep.js"

type ResolveServerAccessResult = {
  currentAccess: ServerAccess
  targetAccess: ServerAccess
}

export const resolveServerAccess: ProvisioningStep<
  { ip: string; serverData: ServerData; appSshPrivateKey: string },
  ResolveServerAccessResult
> = async (serverId, { ip, serverData, appSshPrivateKey }) => {
  const actualStateAccess = RemoteServer.buildServerAccessFromActualState(
    { ip, data: serverData },
    appSshPrivateKey,
  )
  /* v8 ignore start */
  if (!actualStateAccess) {
    throw new ProvisioningError(serverId, "hardened_without_ssh_host_keys")
  }
  /* v8 ignore stop */

  const desiredStateAccess = RemoteServer.buildServerAccessFromDesiredState(
    { ip, data: serverData },
    appSshPrivateKey,
  )
  if (!desiredStateAccess) {
    throw new ProvisioningError(serverId, "no_desired_state_access")
  }

  if ("privateKey" in actualStateAccess) {
    return { currentAccess: actualStateAccess, targetAccess: desiredStateAccess }
  }

  try {
    await new RemoteServer(desiredStateAccess).assertConnectivity()
    return { currentAccess: desiredStateAccess, targetAccess: desiredStateAccess }
  } catch {
    return { currentAccess: actualStateAccess, targetAccess: desiredStateAccess }
  }
}
