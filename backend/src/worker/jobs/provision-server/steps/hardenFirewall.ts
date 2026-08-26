import type { RemoteServer } from "@vancloak/infrastructure"
import type { ProvisioningStep } from "./ProvisioningStep.js"

export const hardenFirewall: ProvisioningStep<
  { remoteServer: RemoteServer; sshPort: number },
  void
> = async (serverId, { remoteServer, sshPort }) => {
  await remoteServer.hardenFirewall(sshPort)
}
