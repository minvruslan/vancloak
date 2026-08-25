import { serve } from "@hono/node-server"
import app from "./app.js"
import { runBootstraps } from "@/core/bootstraps/index.js"
import { checkDatabaseConnection } from "@/core/database/checkDatabaseConnection.js"
import { env } from "@/core/env/index.js"
import {
  checkInfrastructureAssets,
  checkCommandRunnerBinaries,
} from "@/core/infrastructure/index.js"
import { checkMailerConnection } from "@/core/mailer/index.js"
import { startupLogger } from "@/core/logger/index.js"
import { checkQueueConnection } from "@/core/queue/index.js"
import { provisionServerQueue } from "@/core/queue/provision-server/index.js"

const port = env.PORT
const host = env.HOST

startupLogger.info(`VanCloak ${env.APP_VERSION} starting.`)

try {
  await checkInfrastructureAssets()
  await checkCommandRunnerBinaries()
} catch (error) {
  startupLogger.error(
    { error },
    "Runtime prerequisites are missing — the image is packaged incorrectly.",
  )
  process.exit(1)
}

try {
  await checkDatabaseConnection()
  await checkQueueConnection()
} catch (error) {
  startupLogger.error(
    { error },
    "Dependency check failed — is Postgres/Redis running? (docker compose up -d).",
  )
  process.exit(1)
}

try {
  await checkMailerConnection()
} catch (error) {
  startupLogger.error({ error }, "Mailer check failed — verify SMTP_URL and MAIL_FROM.")
  process.exit(1)
}

await runBootstraps()

const server = serve({ fetch: app.fetch, port, hostname: host }, () => {
  startupLogger.info(`Server running on http://${host}:${port}.`)
})

const shutdown = async () => {
  await provisionServerQueue().close()
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
