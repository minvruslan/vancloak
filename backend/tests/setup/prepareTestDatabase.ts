import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import { TestDatabaseUrl } from "@tests/constants/TestDatabaseUrl.js"

export default async function prepareTestDatabase() {
  const connection = postgres(TestDatabaseUrl, { max: 1, onnotice: () => {} })
  try {
    await migrate(drizzle(connection), { migrationsFolder: "./drizzle" })
    const tables = await connection<
      { tablename: string }[]
    >`select tablename from pg_tables where schemaname = 'public'`
    if (tables.length > 0) {
      const quotedTableNames = tables.map((table) => `"${table.tablename}"`).join(", ")
      await connection.unsafe(`truncate table ${quotedTableNames} cascade`)
    }
  } finally {
    await connection.end()
  }
}
