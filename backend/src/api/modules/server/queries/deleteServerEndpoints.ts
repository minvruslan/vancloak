import { eq, inArray } from "drizzle-orm"
import type { DbOrTx } from "@/core/database/index.js"
import { endpoint, endpointPlacement } from "@/core/database/schemas/domainSchema.js"

export async function deleteServerEndpoints(executor: DbOrTx, serverId: string) {
  return executor
    .delete(endpoint)
    .where(
      inArray(
        endpoint.id,
        executor
          .select({ endpointId: endpointPlacement.endpointId })
          .from(endpointPlacement)
          .where(eq(endpointPlacement.serverId, serverId)),
      ),
    )
}
