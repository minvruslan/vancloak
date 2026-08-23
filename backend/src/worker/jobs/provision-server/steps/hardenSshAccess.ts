import { RemoteServer } from "@vancloak/infrastructure"
import type { ServerAccess } from "@vancloak/infrastructure/shared"
import type { ProvisioningStep } from "./ProvisioningStep.js"

export const hardenSshAccess: ProvisioningStep<
  { currentAccess: ServerAccess; targetAccess: ServerAccess },
  void
> = async (serverId, { currentAccess, targetAccess }) => {
  const preHardenAccess =
    "privateKey" in currentAccess ? currentAccess : { ...targetAccess, port: currentAccess.port }
  const preHardenServer = new RemoteServer(preHardenAccess)
  await preHardenServer.assertConnectivity()
  await preHardenServer.assertPrivilegeEscalation()
  await preHardenServer.hardenSshAccess(targetAccess.port)
}
