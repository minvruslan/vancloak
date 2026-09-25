import type { DbOrTx } from "@/core/database/index.js"
import { endpoint, endpointPlacement } from "@/core/database/schemas/domainSchema.js"

export async function insertEndpoints(
  executor: DbOrTx,
  serverId: string,
  endpoints: { protocolId: string; port: number; host: string | null }[],
) {
  if (endpoints.length === 0) return

  const insertedEndpoints = await executor
    .insert(endpoint)
    .values(endpoints.map((item) => ({ ...item, data: {} })))
    .returning({ id: endpoint.id })

  await executor
    .insert(endpointPlacement)
    .values(insertedEndpoints.map((item) => ({ endpointId: item.id, serverId })))
}
