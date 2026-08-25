import { startupLogger } from "@/core/logger/index.js"
import { mailerTransporter } from "./mailerTransporter.js"

export async function checkMailerConnection() {
  if (!mailerTransporter) return

  await mailerTransporter.verify()
  startupLogger.info("Mailer connection ok.")
}
