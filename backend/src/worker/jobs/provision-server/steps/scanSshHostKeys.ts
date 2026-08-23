import { RemoteServer } from "@vancloak/infrastructure"
import type { ServerSsh } from "@vancloak/infrastructure/shared"
import { ProvisioningError } from "../ProvisioningError.js"
import type { ProvisioningStep } from "./ProvisioningStep.js"

export const scanSshHostKeys: ProvisioningStep<{ ip: string; ssh: ServerSsh }, string[]> = async (
  serverId,
  { ip, ssh },
) => {
  if (ssh.type === "privateKey") {
    throw new ProvisioningError(serverId, "hardened_without_ssh_host_keys")
  }

  return RemoteServer.scanSshHostKeys(ip, ssh.port)
}
