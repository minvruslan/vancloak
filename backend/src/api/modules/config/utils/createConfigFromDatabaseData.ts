import type { Config, DeviceType } from "@vancloak/api-contract"
import type { findUserConfigs } from "../queries/findUserConfigs.js"

type ConfigRow = Awaited<ReturnType<typeof findUserConfigs>>[number]

export function createConfigFromDatabaseData(row: ConfigRow): Config {
  return {
    id: row.id,
    name: row.name,
    deviceType: {
      id: row.deviceTypeId,
      code: row.deviceTypeCode as DeviceType["code"],
      name: row.deviceTypeName as DeviceType["name"],
    },
    endpoint: {
      id: row.endpointId,
      port: row.endpointPort,
      host: row.endpointHost,
      protocol: {
        id: row.protocolId,
        code: row.protocolCode as Config["endpoint"]["protocol"]["code"],
        family: row.protocolFamily,
        name: row.protocolName,
      },
      server:
        row.serverId === null || row.serverName === null || row.serverCountry === null
          ? null
          : { id: row.serverId, name: row.serverName, country: row.serverCountry },
    },
    data: row.data,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
