import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, emailOTP } from "better-auth/plugins"
import { db } from "@/core/database/index.js"
import * as schema from "@/core/database/schemas/authSchema.js"
import { sendLoginCodeEmail } from "@/core/mailer/index.js"
import { env } from "@/core/env/index.js"
import { authLogger } from "@/core/logger/index.js"

const EMAIL_OTP_LIFETIME_SECONDS = 300
const EMAIL_OTP_LENGTH = 6
const EMAIL_OTP_ALLOWED_ATTEMPTS = 3
const SESSION_LIFETIME_SECONDS = 604800

export const authServer = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  logger: {
    // better-auth routes its own error logs to the global console logger when level is
    // "error", "warn" or "debug"; "info" keeps every log inside the log callback below.
    level: "info",
    log: (level, message, ...args) => authLogger[level]({ args }, message),
  },
  session: {
    expiresIn: SESSION_LIFETIME_SECONDS,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
    },
    // better-auth silently skips origin and callbackURL checks when NODE_ENV=test; pinning
    // the flag keeps tests running the same CSRF protection as production.
    disableOriginCheck: false,
    ipAddress: {
      // Real client IP comes from X-Forwarded-For. The proxy must overwrite it, not append,
      // or clients could spoof it and bypass rate limiting.
      ipAddressHeaders: ["x-forwarded-for"],
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 3 },
    },
  },
  plugins: [
    admin(),
    emailOTP({
      disableSignUp: true,
      otpLength: EMAIL_OTP_LENGTH,
      expiresIn: EMAIL_OTP_LIFETIME_SECONDS,
      allowedAttempts: EMAIL_OTP_ALLOWED_ATTEMPTS,
      sendVerificationOTP: async ({ email, otp }) => {
        await sendLoginCodeEmail(email, otp)
      },
    }),
  ],
})
