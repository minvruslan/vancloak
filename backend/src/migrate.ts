import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import { env } from "@/core/env/index.js"
import { startupLogger } from "@/core/logger/index.js"

const MIGRATIONS_DIRECTORY_PATH = resolve(process.cwd(), "drizzle")

const client = postgres(env.DATABASE_URL, { max: 1 })

try {
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_DIRECTORY_PATH })
  startupLogger.info(`Migrations applied from ${MIGRATIONS_DIRECTORY_PATH}.`)
} catch (error) {
  startupLogger.error({ error }, "Migrations failed.")
  process.exitCode = 1
} finally {
  await client.end()
}
