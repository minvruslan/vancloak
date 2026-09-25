import { asc, eq } from "drizzle-orm"
import type { DbOrTx } from "@/core/database/index.js"
import {
  endpoint,
  endpointPlacement,
  protocol,
  server,
} from "@/core/database/schemas/domainSchema.js"
import { serverSelection } from "@/core/database/selections/index.js"

export async function findServerById(executor: DbOrTx, serverId: string) {
  return executor
    .select(serverSelection)
    .from(server)
    .leftJoin(endpointPlacement, eq(endpointPlacement.serverId, server.id))
    .leftJoin(endpoint, eq(endpointPlacement.endpointId, endpoint.id))
    .leftJoin(protocol, eq(endpoint.protocolId, protocol.id))
    .where(eq(server.id, serverId))
    .orderBy(asc(endpoint.port))
}
