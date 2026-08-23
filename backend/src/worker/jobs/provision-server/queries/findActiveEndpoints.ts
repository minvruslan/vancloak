import { and, eq } from "drizzle-orm"
import { EndpointDataSchema } from "@vancloak/infrastructure/shared"
import { db } from "@/core/database/index.js"
import { endpoint, protocol } from "@/core/database/schemas/domainSchema.js"

export async function findActiveEndpoints(serverId: string) {
  const rows = await db
    .select({
      endpointId: endpoint.id,
      port: endpoint.port,
      data: endpoint.data,
      protocolCode: protocol.code,
    })
    .from(endpoint)
    .innerJoin(protocol, eq(endpoint.protocolId, protocol.id))
    .where(and(eq(endpoint.serverId, serverId), eq(endpoint.status, "active")))

  return rows.map((row) => {
    const parsedData = EndpointDataSchema.safeParse(row.data)
    return { ...row, data: parsedData.success ? parsedData.data : null }
  })
}
