import { ServerDesiredStateSchema } from "@vancloak/infrastructure/shared"
import type { ServerDesiredState } from "@vancloak/infrastructure/shared"
import { ProvisioningError } from "../ProvisioningError.js"
import { VpnNodeBaseDirectoryPath, VpnNodeSshPort, VpnNodeUsername } from "../constants/index.js"
import type { ProvisioningStep } from "./ProvisioningStep.js"

export const resolveServerDesiredState: ProvisioningStep<
  { desiredState: unknown },
  ServerDesiredState
> = async (serverId, { desiredState }) => {
  const parsedDesiredState = ServerDesiredStateSchema.safeParse(desiredState)
  if (parsedDesiredState.success) return parsedDesiredState.data

  if (desiredState !== undefined) {
    throw new ProvisioningError(serverId, "invalid_server_desired_state", parsedDesiredState.error)
  }

  return ServerDesiredStateSchema.parse({
    ssh: {
      type: "privateKey",
      username: VpnNodeUsername,
      port: VpnNodeSshPort,
    },
    baseDirectory: VpnNodeBaseDirectoryPath,
  })
}
