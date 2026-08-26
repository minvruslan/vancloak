import { ProtocolCodeSchema, ProtocolRegistry } from "@vancloak/infrastructure/shared"
import type { DbOrTx } from "@/core/database/index.js"
import { db } from "@/core/database/index.js"
import { protocol } from "@/core/database/schemas/index.js"

export async function insertTestProtocol(
  overrides: Partial<typeof protocol.$inferInsert> = {},
  executor: DbOrTx = db,
) {
  const [insertedProtocol] = await executor
    .insert(protocol)
    .values({
      code: ProtocolCodeSchema.enum.amneziawg3,
      family: ProtocolRegistry.amneziawg3.family,
      name: ProtocolRegistry.amneziawg3.name,
      ...overrides,
    })
    .returning()
  return insertedProtocol
}
