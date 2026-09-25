import { buildAmneziawg3ConfigName, ProtocolCodeSchema, type Config } from "@vancloak/api-contract"

const TUNNEL_NAME_MAXIMUM_LENGTH = 15

export function buildConfigFileName(config: Config): string {
  const serverName = config.endpoint.server?.name ?? config.endpoint.host ?? "vancloak"
  const name =
    config.data.protocolCode === ProtocolCodeSchema.enum.amneziawg3
      ? buildAmneziawg3ConfigName(serverName, TUNNEL_NAME_MAXIMUM_LENGTH)
      : serverName
  return `${name}.conf`
}
