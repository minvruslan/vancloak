import { and, eq } from "drizzle-orm"
import { ConfigDataSchema } from "@vancloak/infrastructure/shared"
import { db } from "@/core/database/index.js"
import { config } from "@/core/database/schemas/domainSchema.js"

export async function findActiveEndpointConfigDatas(endpointId: string) {
  const rows = await db
    .select({ data: config.data })
    .from(config)
    .where(and(eq(config.endpointId, endpointId), eq(config.status, "active")))

  return rows.map((row) => {
    const parsedData = ConfigDataSchema.safeParse(row.data)
    return parsedData.success ? parsedData.data : null
  })
}
