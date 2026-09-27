import { env } from "@/core/env/index.js"
import { authLogger } from "@/core/logger/index.js"
import { createLoginCodeEmail } from "./createLoginCodeEmail.js"
import { mailerTransporter } from "./mailerTransporter.js"

export async function sendLoginCodeEmail(email: string, code: string) {
  if (process.env.VITEST)
    throw new Error("Real sendLoginCodeEmail reached in tests: mock @/core/mailer instead.")

  if (!mailerTransporter) {
    authLogger.info(`Login code for ${email}: ${code}`)
    return
  }

  const { subject, text, html, attachments } = createLoginCodeEmail(code)

  try {
    await mailerTransporter.sendMail({
      from: env.MAIL_FROM,
      to: email,
      subject,
      text,
      html,
      attachments,
    })
  } catch (error) {
    authLogger.error({ error }, `Failed to send the login code email to ${email}.`)
    throw error
  }

  authLogger.info(`Login code email sent to ${email}.`)
}
