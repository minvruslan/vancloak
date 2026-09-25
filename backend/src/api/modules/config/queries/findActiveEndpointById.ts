import { and, eq } from "drizzle-orm"
import { primaryPlacementCondition } from "@/api/modules/endpoint/index.js"
import type { DbOrTx } from "@/core/database/index.js"
import {
  endpoint,
  endpointPlacement,
  protocol,
  server,
} from "@/core/database/schemas/domainSchema.js"
import { endpointSelection } from "@/core/database/selections/index.js"

export async function findActiveEndpointById(executor: DbOrTx, endpointId: string) {
  const [row] = await executor
    .select(endpointSelection)
    .from(endpoint)
    .innerJoin(endpointPlacement, eq(endpointPlacement.endpointId, endpoint.id))
    .innerJoin(server, eq(endpointPlacement.serverId, server.id))
    .innerJoin(protocol, eq(endpoint.protocolId, protocol.id))
    .where(
      and(
        eq(endpoint.id, endpointId),
        eq(endpoint.status, "active"),
        eq(server.status, "active"),
        primaryPlacementCondition(),
      ),
    )
    .limit(1)
  return row
}
