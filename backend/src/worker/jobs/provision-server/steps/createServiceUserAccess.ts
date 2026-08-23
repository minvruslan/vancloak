import type { RemoteServer } from "@vancloak/infrastructure"
import type { ServerDesiredState } from "@vancloak/infrastructure/shared"
import type { ProvisioningStep } from "./ProvisioningStep.js"

export const createServiceUserAccess: ProvisioningStep<
  { remoteServer: RemoteServer; desiredState: ServerDesiredState; authorizedKeys: string[] },
  void
> = async (serverId, { remoteServer, desiredState, authorizedKeys }) => {
  await remoteServer.createServiceUser(desiredState.ssh.username, desiredState.baseDirectory)
  await remoteServer.installServiceUserAuthorizedKeys(desiredState.ssh.username, authorizedKeys)
}
