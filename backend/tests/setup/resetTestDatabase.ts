import { getTableName, sql } from "drizzle-orm"
import { db } from "@/core/database/index.js"
import { env } from "@/core/env/index.js"
import { TestDatabaseUrl } from "@tests/constants/TestDatabaseUrl.js"
import {
  account,
  config,
  configLimit,
  deviceType,
  endpoint,
  endpointPlacement,
  protocol,
  server,
  session,
  user,
  verification,
} from "@/core/database/schemas/index.js"

const TABLES_TO_RESET = [
  account,
  config,
  configLimit,
  deviceType,
  endpoint,
  endpointPlacement,
  protocol,
  server,
  session,
  user,
  verification,
]

const TRUNCATE_STATEMENT = `truncate table ${TABLES_TO_RESET.map(
  (table) => `"${getTableName(table)}"`,
).join(", ")} cascade`

export async function resetTestDatabase() {
  if (env.DATABASE_URL !== TestDatabaseUrl) {
    throw new Error(`Refusing to truncate a non-test database: ${env.DATABASE_URL}.`)
  }
  await db.execute(sql.raw(TRUNCATE_STATEMENT))
}
