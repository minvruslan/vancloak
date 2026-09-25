import { and, asc, count, eq, sql } from "drizzle-orm"
import type { DbOrTx } from "@/core/database/index.js"
import {
  config,
  endpoint,
  endpointPlacement,
  protocol,
  server,
} from "@/core/database/schemas/domainSchema.js"
import { endpointSelection } from "@/core/database/selections/index.js"
import { primaryPlacementCondition } from "./conditions/primaryPlacementCondition.js"

export async function findActiveEndpoints(executor: DbOrTx) {
  const endpointConfigCount = executor
    .select({
      endpointId: config.endpointId,
      configCount: count(config.id).as("config_count"),
    })
    .from(config)
    .groupBy(config.endpointId)
    .as("endpoint_config_count")

  return executor
    .select(endpointSelection)
    .from(endpoint)
    .innerJoin(protocol, eq(endpoint.protocolId, protocol.id))
    .innerJoin(endpointPlacement, eq(endpointPlacement.endpointId, endpoint.id))
    .innerJoin(server, eq(endpointPlacement.serverId, server.id))
    .leftJoin(endpointConfigCount, eq(endpointConfigCount.endpointId, endpoint.id))
    .where(
      and(eq(endpoint.status, "active"), eq(server.status, "active"), primaryPlacementCondition()),
    )
    .orderBy(
      asc(sql`coalesce(${endpointConfigCount.configCount}, 0)`),
      asc(sql`lower(${server.name})`),
      asc(endpoint.port),
    )
}
