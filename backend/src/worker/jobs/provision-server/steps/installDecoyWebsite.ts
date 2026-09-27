import type { RemoteServer } from "@vancloak/infrastructure"
import type { ServerActualState } from "@vancloak/infrastructure/shared"
import type { ProvisioningStep } from "./ProvisioningStep.js"

const HTTP_PORT = 80
const HTTPS_PORT = 443

export const installDecoyWebsite: ProvisioningStep<
  {
    remoteServer: RemoteServer
    serviceUsername: string
    baseDirectory: string
    domainName: string
  },
  NonNullable<ServerActualState["decoyWebsite"]>
> = async (serverId, { remoteServer, serviceUsername, baseDirectory, domainName }) => {
  await remoteServer.allowFirewallPort(HTTP_PORT, "tcp")
  await remoteServer.allowFirewallPort(HTTPS_PORT, "tcp")
  return remoteServer.installDecoyWebsite(serviceUsername, baseDirectory, domainName)
}
