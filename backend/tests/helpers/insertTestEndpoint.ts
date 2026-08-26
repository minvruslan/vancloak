import type { DbOrTx } from "@/core/database/index.js"
import { db } from "@/core/database/index.js"
import { endpoint } from "@/core/database/schemas/index.js"
import { FakeAmneziawg3EndpointActualState } from "./createFakeAmneziawg3Client.js"

export async function insertTestEndpoint(
  overrides: Partial<typeof endpoint.$inferInsert> &
    Pick<typeof endpoint.$inferInsert, "serverId" | "protocolId">,
  executor: DbOrTx = db,
) {
  const [insertedEndpoint] = await executor
    .insert(endpoint)
    .values({
      port: 51820,
      data: {
        actualState: FakeAmneziawg3EndpointActualState,
      },
      ...overrides,
    })
    .returning()
  return insertedEndpoint
}
