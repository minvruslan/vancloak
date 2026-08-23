import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import type { DbOrTx } from "@/core/database/index.js"
import { protocol } from "@/core/database/schemas/domainSchema.js"
import { protocolSelection } from "@/core/database/selections/index.js"

export async function findActiveProtocols(executor: DbOrTx) {
  return executor
    .select(protocolSelection)
    .from(protocol)
    .where(and(eq(protocol.isEnabled, true), inArray(protocol.code, Object.keys(ProtocolRegistry))))
    .orderBy(asc(sql`lower(${protocol.name})`))
}
