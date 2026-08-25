import { createTransport, type Transporter } from "nodemailer"
import { env } from "@/core/env/index.js"

export const mailerTransporter: Transporter | null = env.SMTP_URL
  ? createTransport(env.SMTP_URL)
  : null
