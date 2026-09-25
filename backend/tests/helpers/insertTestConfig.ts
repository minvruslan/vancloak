import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { Amneziawg3ObfuscationDefaults, ProtocolCodeSchema } from "@vancloak/infrastructure/shared"
import type { DbOrTx } from "@/core/database/index.js"
import { db } from "@/core/database/index.js"
import { config, endpointPlacement } from "@/core/database/schemas/index.js"
import { createTestIp } from "./createTestIp.js"

export async function insertTestConfig(
  overrides: Partial<typeof config.$inferInsert> &
    Pick<typeof config.$inferInsert, "userId" | "endpointId" | "deviceTypeId">,
  executor: DbOrTx = db,
) {
  const [placement] = await executor
    .select({ id: endpointPlacement.id })
    .from(endpointPlacement)
    .where(eq(endpointPlacement.endpointId, overrides.endpointId))
    .limit(1)

  const [insertedConfig] = await executor
    .insert(config)
    .values({
      name: `Test Config ${randomUUID()}`,
      host: "test.example.com",
      placementId: placement?.id ?? null,
      data: {
        protocolCode: ProtocolCodeSchema.enum.amneziawg3,
        clientIp: createTestIp(),
        options: { ...Amneziawg3ObfuscationDefaults },
      },
      status: "active",
      ...overrides,
    })
    .returning()
  return insertedConfig
}
