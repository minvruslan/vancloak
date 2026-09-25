import type { Endpoint } from "@vancloak/api-contract"
import type { findActiveEndpoints } from "../queries/findActiveEndpoints.js"

type EndpointRow = Awaited<ReturnType<typeof findActiveEndpoints>>[number]

export function createEndpointFromDatabaseData(row: EndpointRow): Endpoint {
  return {
    id: row.id,
    port: row.port,
    host: row.host,
    protocol: {
      id: row.protocolId,
      code: row.protocolCode as Endpoint["protocol"]["code"],
      family: row.protocolFamily,
      name: row.protocolName,
    },
    server: {
      id: row.serverId,
      name: row.serverName,
      country: row.serverCountry,
    },
  }
}
