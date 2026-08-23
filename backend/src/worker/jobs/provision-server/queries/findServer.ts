import { eq } from "drizzle-orm"
import { ServerDataSchema } from "@vancloak/infrastructure/shared"
import { db } from "@/core/database/index.js"
import { server } from "@/core/database/schemas/domainSchema.js"

export async function findServer(serverId: string) {
  const [row] = await db
    .select({
      ip: server.ip,
      domainName: server.domainName,
      status: server.status,
      data: server.data,
    })
    .from(server)
    .where(eq(server.id, serverId))
    .limit(1)

  if (!row) return undefined

  const parsedData = ServerDataSchema.safeParse(row.data)
  if (!parsedData.success) {
    return { ip: row.ip, domainName: row.domainName, status: row.status, data: null }
  }

  return { ip: row.ip, domainName: row.domainName, status: row.status, data: parsedData.data }
}
