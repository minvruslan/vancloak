import { env } from "@/core/env/index.js"
import { authLogger } from "@/core/logger/index.js"
import { createMagicLinkEmail } from "./createMagicLinkEmail.js"
import { mailerTransporter } from "./mailerTransporter.js"

export async function sendMagicLinkEmail(email: string, url: string) {
  if (process.env.VITEST)
    throw new Error("Real sendMagicLinkEmail reached in tests: mock @/core/mailer instead.")

  if (!mailerTransporter) {
    authLogger.info(`Magic link for ${email}: ${url}`)
    return
  }

  const { subject, text, html, attachments } = createMagicLinkEmail(url)

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
    authLogger.error({ error }, `Failed to send the magic link email to ${email}.`)
    throw error
  }

  authLogger.info(`Magic link email sent to ${email}.`)
}
