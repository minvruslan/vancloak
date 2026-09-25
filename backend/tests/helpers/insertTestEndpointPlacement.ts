import type { DbOrTx } from "@/core/database/index.js"
import { db } from "@/core/database/index.js"
import { endpointPlacement } from "@/core/database/schemas/index.js"

export async function insertTestEndpointPlacement(
  overrides: Partial<typeof endpointPlacement.$inferInsert> &
    Pick<typeof endpointPlacement.$inferInsert, "endpointId" | "serverId">,
  executor: DbOrTx = db,
) {
  const [insertedPlacement] = await executor.insert(endpointPlacement).values(overrides).returning()
  return insertedPlacement
}
