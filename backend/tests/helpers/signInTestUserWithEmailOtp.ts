import app from "@/api/app.js"
import { db } from "@/core/database/index.js"
import { verification } from "@/core/database/schemas/index.js"
import { env } from "@/core/env/index.js"
import { createTestIp } from "./createTestIp.js"

export async function signInTestUserWithEmailOtp(email: string) {
  await app.request("/api/auth/email-otp/send-verification-otp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": createTestIp(),
      origin: env.BETTER_AUTH_URL,
    },
    body: JSON.stringify({ email, type: "sign-in" }),
  })
  const verificationRows = await db.select().from(verification)
  const [verificationRow] = verificationRows
    .filter((row) => row.identifier === `sign-in-otp-${email.toLowerCase()}`)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
  if (!verificationRow) throw new Error(`No verification row found for ${email}.`)
  const code = verificationRow.value.slice(0, verificationRow.value.lastIndexOf(":"))
  const response = await app.request("/api/auth/sign-in/email-otp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": createTestIp(),
      origin: env.BETTER_AUTH_URL,
    },
    body: JSON.stringify({ email, otp: code }),
  })
  const setCookie = response.headers.get("set-cookie")
  if (!setCookie) throw new Error(`Email OTP sign-in for ${email} set no session cookie.`)
  return setCookie.split(";")[0]
}
