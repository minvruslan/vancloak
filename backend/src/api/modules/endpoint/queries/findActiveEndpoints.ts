import { and, asc, count, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import type { DbOrTx } from "@/core/database/index.js"
import { config, endpoint, protocol, server } from "@/core/database/schemas/domainSchema.js"
import { endpointSelection } from "@/core/database/selections/index.js"

export async function findActiveEndpoints(executor: DbOrTx) {
  const configEndpoint = alias(endpoint, "config_endpoint")
  const serverConfigCount = executor
    .select({
      serverId: configEndpoint.serverId,
      configCount: count(config.id).as("config_count"),
    })
    .from(config)
    .innerJoin(configEndpoint, eq(config.endpointId, configEndpoint.id))
    .groupBy(configEndpoint.serverId)
    .as("server_config_count")

  return executor
    .select(endpointSelection)
    .from(endpoint)
    .innerJoin(protocol, eq(endpoint.protocolId, protocol.id))
    .innerJoin(server, eq(endpoint.serverId, server.id))
    .leftJoin(serverConfigCount, eq(serverConfigCount.serverId, server.id))
    .where(and(eq(endpoint.status, "active"), eq(server.status, "active")))
    .orderBy(
      asc(sql`coalesce(${serverConfigCount.configCount}, 0)`),
      asc(sql`lower(${server.name})`),
      asc(endpoint.port),
    )
}
