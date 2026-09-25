import { and, eq } from "drizzle-orm"
import { EndpointDataSchema, ServerDataSchema } from "@vancloak/infrastructure/shared"
import { primaryPlacementCondition } from "@/api/modules/endpoint/index.js"
import type { DbOrTx } from "@/core/database/index.js"
import {
  endpoint,
  endpointPlacement,
  protocol,
  server,
} from "@/core/database/schemas/domainSchema.js"

export async function findEndpointProtocolClientData(executor: DbOrTx, endpointId: string) {
  const [row] = await executor
    .select({
      placementId: endpointPlacement.id,
      serverIp: server.ip,
      serverData: server.data,
      endpointHost: endpoint.host,
      placementData: endpointPlacement.data,
      protocolCode: protocol.code,
    })
    .from(endpoint)
    .innerJoin(endpointPlacement, eq(endpointPlacement.endpointId, endpoint.id))
    .innerJoin(server, eq(endpointPlacement.serverId, server.id))
    .innerJoin(protocol, eq(endpoint.protocolId, protocol.id))
    .where(and(eq(endpoint.id, endpointId), primaryPlacementCondition()))
    .limit(1)

  /* v8 ignore start */
  if (!row) return undefined
  /* v8 ignore stop */

  const parsedServerData = ServerDataSchema.safeParse(row.serverData)
  const parsedPlacementData = EndpointDataSchema.safeParse(row.placementData)

  return {
    placementId: row.placementId,
    serverIp: row.serverIp,
    endpointHost: row.endpointHost,
    protocolCode: row.protocolCode,
    serverData: parsedServerData.success ? parsedServerData.data : null,
    placementData: parsedPlacementData.success ? parsedPlacementData.data : null,
  }
}
