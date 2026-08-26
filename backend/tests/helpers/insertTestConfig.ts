import { randomUUID } from "node:crypto"
import { Amneziawg3ObfuscationDefaults, ProtocolCodeSchema } from "@vancloak/infrastructure/shared"
import type { DbOrTx } from "@/core/database/index.js"
import { db } from "@/core/database/index.js"
import { config } from "@/core/database/schemas/index.js"
import { createTestIp } from "./createTestIp.js"

export async function insertTestConfig(
  overrides: Partial<typeof config.$inferInsert> &
    Pick<typeof config.$inferInsert, "userId" | "endpointId" | "deviceTypeId">,
  executor: DbOrTx = db,
) {
  const [insertedConfig] = await executor
    .insert(config)
    .values({
      name: `Test Config ${randomUUID()}`,
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
