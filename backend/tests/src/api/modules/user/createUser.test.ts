import { call } from "@orpc/server"
import { UserSchema, type UpsertUser } from "@vancloak/api-contract"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { eq } from "drizzle-orm"
import postgres from "postgres"
import { describe, expect, it, vi } from "vitest"
import app from "@/api/app.js"
import { insertUserConfigLimits } from "@/api/modules/config-limit/queries/insertUserConfigLimits.js"
import { userRouter } from "@/api/modules/user/index.js"
import { insertUser } from "@/api/modules/user/queries/insertUser.js"
import { db } from "@/core/database/index.js"
import { configLimit, user } from "@/core/database/schemas/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  createTestEmail,
  insertTestConfigLimit,
  insertTestSession,
  insertTestUser,
  signInTestAdmin,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/user/queries/insertUser.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/modules/user/queries/insertUser.js")>()
  return { insertUser: vi.fn(original.insertUser) }
})

vi.mock("@/api/modules/config-limit/queries/insertUserConfigLimits.js", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/api/modules/config-limit/queries/insertUserConfigLimits.js")
    >()
  return { insertUserConfigLimits: vi.fn(original.insertUserConfigLimits) }
})

function callCreateUser(input: unknown, headers: Headers) {
  return call(userRouter.createUser, input as UpsertUser, { context: { headers } })
}

describe("POST /users", () => {
  it("responds with HTTP 201 on success", async () => {
    const headers = await signInTestAdmin()
    headers.set("content-type", "application/json")

    const response = await app.request("/api/users", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Created User", email: createTestEmail() }),
    })

    expect(response.status).toBe(201)
  })

  it("stores a mixed-case email lowercased", async () => {
    const mixedCaseEmail = createTestEmail().toUpperCase()

    const createdUser = await callCreateUser(
      { name: "Created User", email: mixedCaseEmail },
      await signInTestAdmin(),
    )

    const parsed = UserSchema.parse(createdUser)
    expect(parsed.email).toBe(mixedCaseEmail.toLowerCase())
    const userRows = await db.select().from(user).where(eq(user.id, parsed.id))
    expect(userRows[0].email).toBe(mixedCaseEmail.toLowerCase())
  })

  it("creates config limits from the provided limits, returns them with used 0 and every contract field at every nesting level, and persists the user and config limit rows", async () => {
    const email = createTestEmail()

    const createdUser = await callCreateUser(
      {
        name: "Created User",
        email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 4 }],
      },
      await signInTestAdmin(),
    )

    expect(Object.keys(createdUser).sort()).toEqual([
      "banReason",
      "banned",
      "createdAt",
      "email",
      "id",
      "limits",
      "name",
      "role",
    ])
    const parsed = UserSchema.parse(createdUser)
    expect(parsed.limits).toHaveLength(1)
    for (const limit of parsed.limits) {
      expect(Object.keys(limit).sort()).toEqual([
        "createdAt",
        "id",
        "maxCount",
        "protocolFamily",
        "updatedAt",
        "used",
      ])
      expect(limit.protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
      expect(limit.maxCount).toBe(4)
      expect(limit.used).toBe(0)
    }
    const configLimitRows = await db
      .select()
      .from(configLimit)
      .where(eq(configLimit.userId, createdUser.id))
    expect(configLimitRows).toHaveLength(1)
    expect(configLimitRows[0].protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
    expect(configLimitRows[0].maxCount).toBe(4)
    const userRows = await db.select().from(user).where(eq(user.id, createdUser.id))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].name).toBe("Created User")
    expect(userRows[0].email).toBe(email)
    expect(userRows[0].emailVerified).toBe(true)
  })

  it("persists the created user and returns every contract field with no role, not banned and empty limits when limits is omitted", async () => {
    const email = createTestEmail()

    const createdUser = await callCreateUser(
      { name: "Created User", email },
      await signInTestAdmin(),
    )

    expect(Object.keys(createdUser).sort()).toEqual([
      "banReason",
      "banned",
      "createdAt",
      "email",
      "id",
      "limits",
      "name",
      "role",
    ])
    const parsed = UserSchema.parse(createdUser)
    expect(parsed.role).toBeNull()
    expect(parsed.banned).toBe(false)
    expect(parsed.limits).toEqual([])
    const userRows = await db.select().from(user).where(eq(user.id, createdUser.id))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].name).toBe("Created User")
    expect(userRows[0].email).toBe(email)
    expect(userRows[0].emailVerified).toBe(true)
  })

  it("leaves another user's config limit untouched", async () => {
    const bystanderUser = await insertTestUser()
    const bystanderConfigLimit = await insertTestConfigLimit({
      userId: bystanderUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 6,
    })

    await callCreateUser(
      {
        name: "Created User",
        email: createTestEmail(),
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 4 }],
      },
      await signInTestAdmin(),
    )

    const configLimitRows = await db
      .select()
      .from(configLimit)
      .where(eq(configLimit.userId, bystanderUser.id))
    expect(configLimitRows).toEqual([bystanderConfigLimit])
  })

  it("accepts a name of exactly 255 characters", async () => {
    const name = "a".repeat(255)

    const createdUser = await callCreateUser(
      { name, email: createTestEmail() },
      await signInTestAdmin(),
    )

    expect(createdUser.name).toBe(name)
  })

  it("rejects limits containing a duplicate protocol family", async () => {
    await expectOrpcError(
      callCreateUser(
        {
          name: "Created User",
          email: createTestEmail(),
          limits: [
            { protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 1 },
            { protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 2 },
          ],
        },
        await signInTestAdmin(),
      ),
      "BAD_REQUEST",
    )
  })

  it("rejects a duplicate email with EMAIL_TAKEN and does not insert a user row", async () => {
    const existingUser = await insertTestUser()

    await expectOrpcError(
      callCreateUser({ name: "Created User", email: existingUser.email }, await signInTestAdmin()),
      "EMAIL_TAKEN",
    )

    const userRows = await db.select().from(user).where(eq(user.email, existingUser.email))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].id).toBe(existingUser.id)
  })

  it("rejects a duplicate email differing only in case with EMAIL_TAKEN", async () => {
    const existingUser = await insertTestUser()

    await expectOrpcError(
      callCreateUser(
        { name: "Created User", email: existingUser.email.toUpperCase() },
        await signInTestAdmin(),
      ),
      "EMAIL_TAKEN",
    )
  })

  it("rejects a duplicate email with EMAIL_TAKEN when the existing user is an admin", async () => {
    const adminUser = await insertTestUser({ role: "admin" })

    await expectOrpcError(
      callCreateUser({ name: "Created User", email: adminUser.email }, await signInTestAdmin()),
      "EMAIL_TAKEN",
    )
  })

  it("responds with HTTP 409 when the email is taken", async () => {
    const existingUser = await insertTestUser()
    const headers = await signInTestAdmin()
    headers.set("content-type", "application/json")

    const response = await app.request("/api/users", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Created User", email: existingUser.email }),
    })

    expect(response.status).toBe(409)
  })

  it("rejects an ordinary user with FORBIDDEN", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(
      callCreateUser({ name: "Created User", email: createTestEmail() }, headers),
      "FORBIDDEN",
    )
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the user insert throws", async () => {
      vi.mocked(insertUser).mockRejectedValueOnce(new Error("Insert failure"))
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Created User", email: createTestEmail() }),
      })
      expect(response.status).toBe(500)
    })

    it("responds with HTTP 500 when the user insert throws a duplicate email violation that is not a PostgresError", async () => {
      vi.mocked(insertUser).mockRejectedValueOnce(
        Object.assign(new Error("Duplicate email"), {
          code: "23505",
          constraint_name: "user_email_unique",
        }),
      )
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Created User", email: createTestEmail() }),
      })
      expect(response.status).toBe(500)
    })

    it("responds with HTTP 500 when the user insert throws a PostgresError that is not a unique violation", async () => {
      vi.mocked(insertUser).mockRejectedValueOnce(
        Object.assign(new postgres.PostgresError("Foreign key violation"), {
          code: "23503",
          constraint_name: "user_email_unique",
        }),
      )
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Created User", email: createTestEmail() }),
      })
      expect(response.status).toBe(500)
    })

    it("responds with HTTP 500 and rolls back the user row when the config limit insert throws", async () => {
      vi.mocked(insertUserConfigLimits).mockRejectedValueOnce(
        new Error("Config limit insert failure"),
      )
      const email = createTestEmail()
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Created User",
          email,
          limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 4 }],
        }),
      })
      expect(response.status).toBe(500)
      const userRows = await db.select().from(user).where(eq(user.email, email))
      expect(userRows).toHaveLength(0)
    })

    it("responds with HTTP 500 when the user insert throws a unique violation on another constraint", async () => {
      vi.mocked(insertUser).mockRejectedValueOnce(
        Object.assign(new postgres.PostgresError("Unique violation"), {
          code: "23505",
          constraint_name: "user_name_unique",
        }),
      )
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Created User", email: createTestEmail() }),
      })
      expect(response.status).toBe(500)
    })
  })
})
