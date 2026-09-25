import { eq } from "drizzle-orm"
import type { DbOrTx } from "@/core/database/index.js"
import { config } from "@/core/database/schemas/domainSchema.js"

export async function findReservedClientIdentifiers(
  executor: DbOrTx,
  endpointId: string,
): Promise<(string | null)[]> {
  const rows = await executor
    .select({ clientIdentifier: config.clientIdentifier })
    .from(config)
    .where(eq(config.endpointId, endpointId))
  return rows.map((row) => row.clientIdentifier)
}
