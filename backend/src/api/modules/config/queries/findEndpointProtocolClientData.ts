import { eq } from "drizzle-orm"
import { EndpointDataSchema, ServerDataSchema } from "@vancloak/infrastructure/shared"
import type { DbOrTx } from "@/core/database/index.js"
import { endpoint, protocol, server } from "@/core/database/schemas/domainSchema.js"

export async function findEndpointProtocolClientData(executor: DbOrTx, endpointId: string) {
  const [row] = await executor
    .select({
      serverIp: server.ip,
      serverData: server.data,
      endpointData: endpoint.data,
      protocolCode: protocol.code,
    })
    .from(endpoint)
    .innerJoin(server, eq(endpoint.serverId, server.id))
    .innerJoin(protocol, eq(endpoint.protocolId, protocol.id))
    .where(eq(endpoint.id, endpointId))
    .limit(1)

  /* v8 ignore start */
  if (!row) return undefined
  /* v8 ignore stop */

  const parsedServerData = ServerDataSchema.safeParse(row.serverData)
  const parsedEndpointData = EndpointDataSchema.safeParse(row.endpointData)

  return {
    serverIp: row.serverIp,
    protocolCode: row.protocolCode,
    serverData: parsedServerData.success ? parsedServerData.data : null,
    endpointData: parsedEndpointData.success ? parsedEndpointData.data : null,
  }
}
