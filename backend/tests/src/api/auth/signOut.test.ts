import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import app from "@/api/app.js"
import { db } from "@/core/database/index.js"
import { session } from "@/core/database/schemas/index.js"
import { env } from "@/core/env/index.js"
import { createTestIp, insertTestUser, signInTestUserWithEmailOtp } from "@tests/helpers/index.js"

const SESSION_COOKIE_NAME = "better-auth.session_token"

function requestSignOut(cookie: string, origin: string | null = env.BETTER_AUTH_URL) {
  const headers: Record<string, string> = {
    cookie,
    "content-type": "application/json",
    "x-forwarded-for": createTestIp(),
  }
  if (origin !== null) headers.origin = origin
  return app.request("/api/auth/sign-out", { method: "POST", headers })
}

describe("POST /api/auth/sign-out", () => {
  it("reports a successful sign-out", async () => {
    const requestUser = await insertTestUser()
    const sessionCookie = await signInTestUserWithEmailOtp(requestUser.email)

    const response = await requestSignOut(sessionCookie)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
  })

  it("expires the session cookie", async () => {
    const requestUser = await insertTestUser()
    const sessionCookie = await signInTestUserWithEmailOtp(requestUser.email)

    const response = await requestSignOut(sessionCookie)

    const setCookie = response.headers.get("set-cookie") ?? ""
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=;`)
    expect(setCookie).toContain("Max-Age=0")
  })

  it("removes the session row", async () => {
    const requestUser = await insertTestUser()
    const sessionCookie = await signInTestUserWithEmailOtp(requestUser.email)

    await requestSignOut(sessionCookie)

    expect(await db.select().from(session)).toHaveLength(0)
  })

  it("makes the signed-out cookie unusable on an api request", async () => {
    const requestUser = await insertTestUser()
    const sessionCookie = await signInTestUserWithEmailOtp(requestUser.email)
    expect(
      (await app.request("/api/device-types", { headers: { cookie: sessionCookie } })).status,
    ).toBe(200)

    await requestSignOut(sessionCookie)

    const response = await app.request("/api/device-types", { headers: { cookie: sessionCookie } })
    expect(response.status).toBe(401)
  })

  it("rejects a sign-out without an origin header and keeps the session", async () => {
    const requestUser = await insertTestUser()
    const sessionCookie = await signInTestUserWithEmailOtp(requestUser.email)

    const response = await requestSignOut(sessionCookie, null)

    expect(response.status).toBe(403)
    expect(await db.select().from(session)).toHaveLength(1)
  })

  it("rejects a sign-out from a foreign origin and keeps the session", async () => {
    const requestUser = await insertTestUser()
    const sessionCookie = await signInTestUserWithEmailOtp(requestUser.email)

    const response = await requestSignOut(sessionCookie, "https://evil.example")

    expect(response.status).toBe(403)
    expect(await db.select().from(session)).toHaveLength(1)

    const apiResponse = await app.request("/api/device-types", {
      headers: { cookie: sessionCookie },
    })
    expect(apiResponse.status).toBe(200)
  })

  it("keeps the same user's other session intact", async () => {
    const requestUser = await insertTestUser()
    const firstDeviceCookie = await signInTestUserWithEmailOtp(requestUser.email)
    const secondDeviceCookie = await signInTestUserWithEmailOtp(requestUser.email)

    await requestSignOut(firstDeviceCookie)

    const sessionRows = await db.select().from(session).where(eq(session.userId, requestUser.id))
    expect(sessionRows).toHaveLength(1)

    const response = await app.request("/api/device-types", {
      headers: { cookie: secondDeviceCookie },
    })
    expect(response.status).toBe(200)
  })

  it("keeps other users' sessions intact", async () => {
    const signingOutUser = await insertTestUser()
    const otherUser = await insertTestUser()
    const signingOutCookie = await signInTestUserWithEmailOtp(signingOutUser.email)
    const otherCookie = await signInTestUserWithEmailOtp(otherUser.email)

    await requestSignOut(signingOutCookie)

    const otherSessionRows = await db.select().from(session).where(eq(session.userId, otherUser.id))
    expect(otherSessionRows).toHaveLength(1)

    const response = await app.request("/api/device-types", { headers: { cookie: otherCookie } })
    expect(response.status).toBe(200)
  })
})
