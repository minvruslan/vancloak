import { describe, expect, it } from "vitest"
import app from "@/api/app.js"
import { insertTestSession } from "./insertTestSession.js"
import { insertTestUser } from "./insertTestUser.js"
import { signInTestUserWithEmailOtp } from "./signInTestUserWithEmailOtp.js"

describe("insertTestSession", () => {
  it("produces a cookie the api accepts just like one from a real email otp sign-in", async () => {
    const insertedUser = await insertTestUser()
    const signedInUser = await insertTestUser()
    const insertedCookie = (await insertTestSession(insertedUser)).get("cookie")
    const signedInCookie = await signInTestUserWithEmailOtp(signedInUser.email)

    const [insertedCookieName, insertedCookieValue] = insertedCookie!.split("=")
    const [signedInCookieName, signedInCookieValue] = signedInCookie.split("=")
    expect(insertedCookieName).toBe(signedInCookieName)
    expect(insertedCookieValue.split(".")).toHaveLength(2)
    expect(decodeURIComponent(signedInCookieValue).split(".")).toHaveLength(2)

    const insertedCookieResponse = await app.request("/api/device-types", {
      headers: { cookie: insertedCookie! },
    })
    const signedInCookieResponse = await app.request("/api/device-types", {
      headers: { cookie: signedInCookie },
    })
    expect(insertedCookieResponse.status).toBe(200)
    expect(signedInCookieResponse.status).toBe(200)
  })
})
