import { bootstrapLogger } from "@/core/logger/index.js"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { sql } from "drizzle-orm"
import { db } from "@/core/database/index.js"
import { protocol } from "@/core/database/schemas/domainSchema.js"

const PROTOCOL_ROWS = Object.entries(ProtocolRegistry).map(([code, { family, name }]) => ({
  code,
  family,
  name,
}))

export async function bootstrapProtocols() {
  const upserted = await db
    .insert(protocol)
    .values(PROTOCOL_ROWS)
    .onConflictDoUpdate({
      target: protocol.code,
      set: { name: sql`excluded.name`, family: sql`excluded.family` },
      setWhere: sql`${protocol.name} is distinct from excluded.name or ${protocol.family} is distinct from excluded.family`,
    })
    .returning({ code: protocol.code })

  if (upserted.length > 0) {
    bootstrapLogger.info(`Seeded or updated protocols: ${upserted.map((r) => r.code).join(", ")}.`)
  }
}
