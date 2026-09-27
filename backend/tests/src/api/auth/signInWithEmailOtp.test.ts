import { eq } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"
import app from "@/api/app.js"
import { db } from "@/core/database/index.js"
import { session, user, verification } from "@/core/database/schemas/index.js"
import { sendLoginCodeEmail } from "@/core/mailer/index.js"
import { createTestEmail, createTestIp, insertTestUser } from "@tests/helpers/index.js"

const SESSION_COOKIE_NAME = "better-auth.session_token"
const SESSION_LIFETIME_SECONDS = 604800

async function requestLoginCode(email: string) {
  await app.request("/api/auth/email-otp/send-verification-otp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": createTestIp() },
    body: JSON.stringify({ email, type: "sign-in" }),
  })
  const [verificationRow] = await db.select().from(verification)
  return verificationRow.value.slice(0, verificationRow.value.lastIndexOf(":"))
}

function signInWithEmailOtp(email: string, code: string) {
  return app.request("/api/auth/sign-in/email-otp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": createTestIp() },
    body: JSON.stringify({ email, otp: code }),
  })
}

function createWrongCode(code: string) {
  return code === "000000" ? "000001" : "000000"
}

function readSessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie")
  if (!setCookie?.includes(`${SESSION_COOKIE_NAME}=`)) return null
  const [cookiePair] = setCookie.split(";")
  return cookiePair.startsWith(`${SESSION_COOKIE_NAME}=`) ? cookiePair : null
}

describe("POST /api/auth/sign-in/email-otp", () => {
  it("signs in with the code carried by the email", async () => {
    const requestUser = await insertTestUser()
    await requestLoginCode(requestUser.email)
    const [, sentCode] = vi.mocked(sendLoginCodeEmail).mock.calls[0]

    const response = await signInWithEmailOtp(requestUser.email, sentCode)

    expect(response.status).toBe(200)
    expect(readSessionCookie(response)).not.toBeNull()
    const sessionRows = await db.select().from(session).where(eq(session.userId, requestUser.id))
    expect(sessionRows).toHaveLength(1)
  })

  it("sets a signed session cookie", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)

    const response = await signInWithEmailOtp(requestUser.email, code)

    const sessionCookie = readSessionCookie(response)
    expect(sessionCookie).not.toBeNull()
    const cookieValue = decodeURIComponent(sessionCookie!.split("=")[1])
    expect(cookieValue.split(".")).toHaveLength(2)
  })

  it("sets the session cookie with HttpOnly, SameSite=Lax and Path=/", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)

    const response = await signInWithEmailOtp(requestUser.email, code)

    const setCookie = response.headers.get("set-cookie") ?? ""
    const cookieAttributes = setCookie.split(";").map((part) => part.trim().toLowerCase())
    expect(cookieAttributes).toContain("httponly")
    expect(cookieAttributes).toContain("samesite=lax")
    expect(cookieAttributes).toContain("path=/")
    expect(cookieAttributes).toContain(`max-age=${SESSION_LIFETIME_SECONDS}`)
  })

  it("persists a session row expiring in seven days for the signed-in user", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)
    const beforeSignIn = Date.now()

    await signInWithEmailOtp(requestUser.email, code)

    const afterSignIn = Date.now()
    const sessionRows = await db.select().from(session).where(eq(session.userId, requestUser.id))
    expect(sessionRows).toHaveLength(1)
    const expiresAtMs = sessionRows[0].expiresAt.getTime()
    expect(expiresAtMs).toBeGreaterThanOrEqual(beforeSignIn + SESSION_LIFETIME_SECONDS * 1000)
    expect(expiresAtMs).toBeLessThanOrEqual(afterSignIn + SESSION_LIFETIME_SECONDS * 1000)
  })

  it("signs in the user when the code was requested in a different letter case", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email.toUpperCase())

    const response = await signInWithEmailOtp(requestUser.email.toUpperCase(), code)

    expect(readSessionCookie(response)).not.toBeNull()
    const sessionRows = await db.select().from(session).where(eq(session.userId, requestUser.id))
    expect(sessionRows).toHaveLength(1)
  })

  it("issues a cookie that authorizes an api request", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)
    const sessionCookie = readSessionCookie(await signInWithEmailOtp(requestUser.email, code))

    const response = await app.request("/api/device-types", {
      headers: { cookie: sessionCookie ?? "" },
    })

    expect(response.status).toBe(200)
  })

  it("marks the user email as verified", async () => {
    const requestUser = await insertTestUser({ emailVerified: false })
    const code = await requestLoginCode(requestUser.email)

    await signInWithEmailOtp(requestUser.email, code)

    const userRows = await db.select().from(user).where(eq(user.id, requestUser.id))
    expect(userRows[0].emailVerified).toBe(true)
  })

  it("consumes the verification row", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)

    await signInWithEmailOtp(requestUser.email, code)

    expect(await db.select().from(verification)).toHaveLength(0)
  })

  it("rejects the same code on a second use", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)
    await signInWithEmailOtp(requestUser.email, code)

    const response = await signInWithEmailOtp(requestUser.email, code)

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("INVALID_OTP")
    expect(readSessionCookie(response)).toBeNull()
  })

  it("creates no second session on a replayed code", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)
    await signInWithEmailOtp(requestUser.email, code)

    await signInWithEmailOtp(requestUser.email, code)

    const sessionRows = await db.select().from(session).where(eq(session.userId, requestUser.id))
    expect(sessionRows).toHaveLength(1)
  })

  it("creates exactly one session when the code is submitted twice in parallel", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)

    const responses = await Promise.all([
      signInWithEmailOtp(requestUser.email, code),
      signInWithEmailOtp(requestUser.email, code),
    ])

    const successResponses = responses.filter((response) => response.status === 200)
    expect(successResponses).toHaveLength(1)
    const sessionRows = await db.select().from(session).where(eq(session.userId, requestUser.id))
    expect(sessionRows).toHaveLength(1)
  })

  it("rejects a wrong code and keeps the verification row for another attempt", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)

    const response = await signInWithEmailOtp(requestUser.email, createWrongCode(code))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("INVALID_OTP")
    expect(readSessionCookie(response)).toBeNull()
    expect(await db.select().from(session)).toHaveLength(0)
    const [verificationRow] = await db.select().from(verification)
    expect(verificationRow.value).toBe(`${code}:1`)
  })

  it("rejects the correct code after three wrong attempts", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await signInWithEmailOtp(requestUser.email, createWrongCode(code))
    }

    const response = await signInWithEmailOtp(requestUser.email, code)

    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe("TOO_MANY_ATTEMPTS")
    expect(readSessionCookie(response)).toBeNull()
    expect(await db.select().from(session)).toHaveLength(0)
    expect(await db.select().from(verification)).toHaveLength(0)
  })

  it("rejects a code that was never requested", async () => {
    const requestUser = await insertTestUser()

    const response = await signInWithEmailOtp(requestUser.email, "000000")

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("INVALID_OTP")
    expect(await db.select().from(session)).toHaveLength(0)
  })

  it("rejects an expired code", async () => {
    const requestUser = await insertTestUser()
    const code = await requestLoginCode(requestUser.email)
    await db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(verification.identifier, `sign-in-otp-${requestUser.email}`))

    const response = await signInWithEmailOtp(requestUser.email, code)

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OTP_EXPIRED")
    expect(readSessionCookie(response)).toBeNull()
    expect(await db.select().from(session)).toHaveLength(0)
    expect(await db.select().from(verification)).toHaveLength(0)
  })

  it("refuses to sign up an unknown email", async () => {
    const response = await signInWithEmailOtp(createTestEmail(), "000000")

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("INVALID_OTP")
    expect(readSessionCookie(response)).toBeNull()
    expect(await db.select().from(user)).toHaveLength(0)
  })

  it("refuses a banned user with 403 and no cookie", async () => {
    const bannedUser = await insertTestUser({ banned: true })
    const code = await requestLoginCode(bannedUser.email)

    const response = await signInWithEmailOtp(bannedUser.email, code)

    expect(response.status).toBe(403)
    expect(readSessionCookie(response)).toBeNull()
    expect(await db.select().from(session)).toHaveLength(0)
  })
})
