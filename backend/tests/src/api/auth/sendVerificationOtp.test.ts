import { describe, expect, it, vi } from "vitest"
import app from "@/api/app.js"
import { db } from "@/core/database/index.js"
import { verification } from "@/core/database/schemas/index.js"
import { sendLoginCodeEmail } from "@/core/mailer/index.js"
import { createTestEmail, createTestIp, insertTestUser } from "@tests/helpers/index.js"

const EMAIL_OTP_LIFETIME_SECONDS = 300

async function requestLoginCode(body: unknown, clientIp: string) {
  return app.request("/api/auth/email-otp/send-verification-otp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": clientIp },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/email-otp/send-verification-otp", () => {
  it("accepts a login code request for a known user", async () => {
    const requestUser = await insertTestUser()

    const response = await requestLoginCode(
      { email: requestUser.email, type: "sign-in" },
      createTestIp(),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
  })

  it("stores a verification row keyed by the requested email", async () => {
    const requestUser = await insertTestUser()

    await requestLoginCode({ email: requestUser.email, type: "sign-in" }, createTestIp())

    const verificationRows = await db.select().from(verification)
    expect(verificationRows).toHaveLength(1)
    expect(verificationRows[0].identifier).toBe(`sign-in-otp-${requestUser.email}`)
    expect(verificationRows[0].value).toMatch(/^\d{6}:0$/)
  })

  it("stores a verification row expiring in five minutes", async () => {
    const requestUser = await insertTestUser()
    const beforeRequest = Date.now()

    await requestLoginCode({ email: requestUser.email, type: "sign-in" }, createTestIp())

    const afterRequest = Date.now()
    const [verificationRow] = await db.select().from(verification)
    const expiresAtMs = verificationRow.expiresAt.getTime()
    expect(expiresAtMs).toBeGreaterThanOrEqual(beforeRequest + EMAIL_OTP_LIFETIME_SECONDS * 1000)
    expect(expiresAtMs).toBeLessThanOrEqual(afterRequest + EMAIL_OTP_LIFETIME_SECONDS * 1000)
  })

  it("sends the stored login code to the requested email", async () => {
    const requestUser = await insertTestUser()

    await requestLoginCode({ email: requestUser.email, type: "sign-in" }, createTestIp())

    expect(sendLoginCodeEmail).toHaveBeenCalledTimes(1)
    const [sentEmail, sentCode] = vi.mocked(sendLoginCodeEmail).mock.calls[0]
    expect(sentEmail).toBe(requestUser.email)
    expect(sentCode).toMatch(/^\d{6}$/)
    const [verificationRow] = await db.select().from(verification)
    expect(verificationRow.value).toBe(`${sentCode}:0`)
  })

  it("sends the login code when the email is requested in a different letter case", async () => {
    const requestUser = await insertTestUser()

    await requestLoginCode(
      { email: requestUser.email.toUpperCase(), type: "sign-in" },
      createTestIp(),
    )

    expect(sendLoginCodeEmail).toHaveBeenCalledTimes(1)
  })

  it("sends no login code and keeps no verification row for an unknown email", async () => {
    const response = await requestLoginCode(
      { email: createTestEmail(), type: "sign-in" },
      createTestIp(),
    )

    expect(response.status).toBe(200)
    expect(sendLoginCodeEmail).not.toHaveBeenCalled()
    expect(await db.select().from(verification)).toHaveLength(0)
  })

  it("answers an unknown email exactly as a known one", async () => {
    const requestUser = await insertTestUser()

    const knownEmailResponse = await requestLoginCode(
      { email: requestUser.email, type: "sign-in" },
      createTestIp(),
    )

    const unknownEmailResponse = await requestLoginCode(
      { email: createTestEmail(), type: "sign-in" },
      createTestIp(),
    )

    expect(unknownEmailResponse.status).toBe(knownEmailResponse.status)
    expect(await unknownEmailResponse.json()).toEqual(await knownEmailResponse.json())
  })

  it("rejects a request without an email", async () => {
    const response = await requestLoginCode({ type: "sign-in" }, createTestIp())

    expect(response.status).toBe(400)
  })

  it("rejects a malformed email", async () => {
    const response = await requestLoginCode(
      { email: "not-an-email", type: "sign-in" },
      createTestIp(),
    )

    expect(response.status).toBe(400)
  })

  it("rate-limits a fourth request from the same client ip", async () => {
    const requestUser = await insertTestUser()
    const clientIp = createTestIp()

    const statuses: number[] = []
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await requestLoginCode(
        { email: requestUser.email, type: "sign-in" },
        clientIp,
      )
      statuses.push(response.status)
    }

    expect(statuses).toEqual([200, 200, 200, 429])
  })

  it("counts the rate limit per client ip taken from x-forwarded-for", async () => {
    const requestUser = await insertTestUser()
    const exhaustedClientIp = createTestIp()
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await requestLoginCode({ email: requestUser.email, type: "sign-in" }, exhaustedClientIp)
    }

    const otherClientResponse = await requestLoginCode(
      { email: requestUser.email, type: "sign-in" },
      createTestIp(),
    )

    expect(otherClientResponse.status).toBe(200)
  })
})
