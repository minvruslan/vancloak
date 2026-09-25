import { eq } from "drizzle-orm"
import type { DbOrTx } from "@/core/database/index.js"
import {
  config,
  deviceType,
  endpoint,
  endpointPlacement,
  protocol,
  server,
} from "@/core/database/schemas/domainSchema.js"
import { configSelection } from "@/core/database/selections/index.js"

export async function findConfigById(executor: DbOrTx, configId: string) {
  return executor
    .select(configSelection)
    .from(config)
    .innerJoin(deviceType, eq(config.deviceTypeId, deviceType.id))
    .innerJoin(endpoint, eq(config.endpointId, endpoint.id))
    .innerJoin(protocol, eq(endpoint.protocolId, protocol.id))
    .leftJoin(endpointPlacement, eq(config.placementId, endpointPlacement.id))
    .leftJoin(server, eq(endpointPlacement.serverId, server.id))
    .where(eq(config.id, configId))
}
