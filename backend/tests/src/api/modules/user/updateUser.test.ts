import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import { UserSchema, type UpsertUser } from "@vancloak/api-contract"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { eq } from "drizzle-orm"
import postgres from "postgres"
import { beforeEach, describe, expect, it, vi } from "vitest"
import app from "@/api/app.js"
import { userRouter } from "@/api/modules/user/index.js"
import { updateUser } from "@/api/modules/user/queries/updateUser.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { config, configLimit, deviceType, user } from "@/core/database/schemas/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  createTestEmail,
  insertTestConfig,
  insertTestConfigLimit,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
  signInTestAdmin,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/user/queries/updateUser.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/modules/user/queries/updateUser.js")>()
  return { updateUser: vi.fn(original.updateUser) }
})

function callUpdateUser(input: unknown, headers: Headers) {
  return call(userRouter.updateUser, input as UpsertUser & { id: string }, { context: { headers } })
}

async function insertConfigPrerequisites() {
  const configProtocol = await insertTestProtocol()
  const configServer = await insertTestServer()
  const configEndpoint = await insertTestEndpoint({
    serverId: configServer.id,
    protocolId: configProtocol.id,
  })
  const [configDeviceType] = await db.select().from(deviceType).limit(1)
  return { configEndpoint, configDeviceType }
}

describe("PUT /users/{id}", () => {
  beforeEach(bootstrapDeviceTypes)

  it("updates the name and email and returns the user matching the contract schema", async () => {
    const targetUser = await insertTestUser()
    const newEmail = createTestEmail()

    const updatedUser = await callUpdateUser(
      { id: targetUser.id, name: "Updated Name", email: newEmail },
      await signInTestAdmin(),
    )

    const parsed = UserSchema.parse(updatedUser)
    expect(parsed.id).toBe(targetUser.id)
    expect(parsed.name).toBe("Updated Name")
    expect(parsed.email).toBe(newEmail)
  })

  it("returns every contract field at every nesting level", async () => {
    const targetUser = await insertTestUser()

    const updatedUser = await callUpdateUser(
      {
        id: targetUser.id,
        name: "Updated Name",
        email: targetUser.email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 2 }],
      },
      await signInTestAdmin(),
    )

    expect(Object.keys(updatedUser).sort()).toEqual([
      "banReason",
      "banned",
      "createdAt",
      "email",
      "id",
      "limits",
      "name",
      "role",
    ])
    expect(updatedUser.limits).toHaveLength(1)
    for (const limit of updatedUser.limits) {
      expect(Object.keys(limit).sort()).toEqual([
        "createdAt",
        "id",
        "maxCount",
        "protocolFamily",
        "updatedAt",
        "used",
      ])
    }
  })

  it("persists the updated name and email in the database", async () => {
    const targetUser = await insertTestUser()
    const newEmail = createTestEmail()

    await callUpdateUser(
      { id: targetUser.id, name: "Updated Name", email: newEmail },
      await signInTestAdmin(),
    )

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].name).toBe("Updated Name")
    expect(userRows[0].email).toBe(newEmail)
  })

  it("leaves role, banned and banReason unchanged", async () => {
    const targetUser = await insertTestUser({
      role: "user",
      banned: true,
      banReason: "Violation of terms",
    })

    const updatedUser = await callUpdateUser(
      { id: targetUser.id, name: "Updated Name", email: targetUser.email },
      await signInTestAdmin(),
    )

    const parsed = UserSchema.parse(updatedUser)
    expect(parsed.role).toBe("user")
    expect(parsed.banned).toBe(true)
    expect(parsed.banReason).toBe("Violation of terms")
  })

  it("updates maxCount of an existing limit for the same protocol family", async () => {
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 2,
    })

    const updatedUser = await callUpdateUser(
      {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 7 }],
      },
      await signInTestAdmin(),
    )

    expect(updatedUser.limits).toHaveLength(1)
    for (const limit of updatedUser.limits) {
      expect(limit.protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
      expect(limit.maxCount).toBe(7)
    }
  })

  it("creates a limit for a protocol family the user did not have yet", async () => {
    const targetUser = await insertTestUser()

    const updatedUser = await callUpdateUser(
      {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 3 }],
      },
      await signInTestAdmin(),
    )

    expect(updatedUser.limits).toHaveLength(1)
    for (const limit of updatedUser.limits) {
      expect(limit.protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
      expect(limit.maxCount).toBe(3)
      expect(limit.used).toBe(0)
    }
  })

  it("deletes all the user's limits when limits is omitted", async () => {
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 2,
    })

    const updatedUser = await callUpdateUser(
      { id: targetUser.id, name: targetUser.name, email: targetUser.email },
      await signInTestAdmin(),
    )

    expect(updatedUser.limits).toEqual([])
  })

  it("persists the limit changes in the database", async () => {
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 2,
    })

    await callUpdateUser(
      {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 9 }],
      },
      await signInTestAdmin(),
    )

    const configLimitRows = await db
      .select()
      .from(configLimit)
      .where(eq(configLimit.userId, targetUser.id))
    expect(configLimitRows).toHaveLength(1)
    expect(configLimitRows[0].protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
    expect(configLimitRows[0].maxCount).toBe(9)
  })

  it("leaves another user's config limit untouched", async () => {
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 2,
    })
    const bystanderUser = await insertTestUser()
    const bystanderConfigLimit = await insertTestConfigLimit({
      userId: bystanderUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 6,
    })

    await callUpdateUser(
      {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 9 }],
      },
      await signInTestAdmin(),
    )

    const configLimitRows = await db
      .select()
      .from(configLimit)
      .where(eq(configLimit.userId, bystanderUser.id))
    expect(configLimitRows).toEqual([bystanderConfigLimit])
  })

  it("returns limits with used counting the user's slot-reserving configs of the matching protocol family", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    for (const status of ["active", "pending", "deleting"] as const) {
      await insertTestConfig({
        userId: targetUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
        status,
      })
    }

    const updatedUser = await callUpdateUser(
      {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 5 }],
      },
      await signInTestAdmin(),
    )

    expect(updatedUser.limits).toHaveLength(1)
    for (const limit of updatedUser.limits) {
      expect(limit.used).toBe(2)
    }
  })

  it("persists a maxCount lower than the user's current used count", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 5,
    })
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    await callUpdateUser(
      {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 1 }],
      },
      await signInTestAdmin(),
    )

    const configLimitRows = await db
      .select()
      .from(configLimit)
      .where(eq(configLimit.userId, targetUser.id))
    expect(configLimitRows).toHaveLength(1)
    expect(configLimitRows[0].maxCount).toBe(1)
  })

  it("returns the reduced limit with used still exceeding the new maxCount", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 5,
    })
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const updatedUser = await callUpdateUser(
      {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 1 }],
      },
      await signInTestAdmin(),
    )

    const parsed = UserSchema.parse(updatedUser)
    expect(parsed.limits).toHaveLength(1)
    for (const limit of parsed.limits) {
      expect(limit.maxCount).toBe(1)
      expect(limit.used).toBe(2)
    }
  })

  it("keeps the user's configs untouched when their limits are deleted via an empty limits array", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 5,
    })
    const firstConfig = await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    const secondConfig = await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    await callUpdateUser(
      { id: targetUser.id, name: targetUser.name, email: targetUser.email, limits: [] },
      await signInTestAdmin(),
    )

    const configRows = await db.select().from(config).where(eq(config.userId, targetUser.id))
    expect(configRows.map((row) => row.id).sort()).toEqual([firstConfig.id, secondConfig.id].sort())
    for (const row of configRows) {
      expect(row.status).toBe("active")
    }
  })

  it("rejects updating a user with role admin with NOT_FOUND", async () => {
    const adminUser = await insertTestUser({ role: "admin" })

    await expectOrpcError(
      callUpdateUser(
        { id: adminUser.id, name: "Updated Name", email: adminUser.email },
        await signInTestAdmin(),
      ),
      "NOT_FOUND",
    )

    const userRows = await db.select().from(user).where(eq(user.id, adminUser.id))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].name).toBe(adminUser.name)
    expect(userRows[0].email).toBe(adminUser.email)
  })

  it("accepts updating the email to its current value", async () => {
    const targetUser = await insertTestUser()

    const updatedUser = await callUpdateUser(
      { id: targetUser.id, name: "Updated Name", email: targetUser.email },
      await signInTestAdmin(),
    )

    const parsed = UserSchema.parse(updatedUser)
    expect(parsed.email).toBe(targetUser.email)
    expect(parsed.name).toBe("Updated Name")
  })

  it("accepts updating the email to its current value differing only in case", async () => {
    const targetUser = await insertTestUser()

    const updatedUser = await callUpdateUser(
      { id: targetUser.id, name: "Updated Name", email: targetUser.email.toUpperCase() },
      await signInTestAdmin(),
    )

    const parsed = UserSchema.parse(updatedUser)
    expect(parsed.email).toBe(targetUser.email)
    expect(parsed.name).toBe("Updated Name")
  })

  it("stores an updated mixed-case email lowercased", async () => {
    const targetUser = await insertTestUser()
    const mixedCaseEmail = createTestEmail().toUpperCase()

    await callUpdateUser(
      { id: targetUser.id, name: targetUser.name, email: mixedCaseEmail },
      await signInTestAdmin(),
    )

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows[0].email).toBe(mixedCaseEmail.toLowerCase())
  })

  it("rejects updating the email to another user's email with EMAIL_TAKEN and persists neither user nor limit changes", async () => {
    const targetUser = await insertTestUser()
    const otherUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 2,
    })

    await expectOrpcError(
      callUpdateUser(
        {
          id: targetUser.id,
          name: "Updated Name",
          email: otherUser.email,
          limits: [{ protocolFamily: ProtocolRegistry.amneziawg2.family, maxCount: 9 }],
        },
        await signInTestAdmin(),
      ),
      "EMAIL_TAKEN",
    )

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].name).toBe(targetUser.name)
    expect(userRows[0].email).toBe(targetUser.email)
    const configLimitRows = await db
      .select()
      .from(configLimit)
      .where(eq(configLimit.userId, targetUser.id))
    expect(configLimitRows).toHaveLength(1)
    expect(configLimitRows[0].maxCount).toBe(2)
  })

  it("rejects updating the email to another user's email differing only in case with EMAIL_TAKEN", async () => {
    const targetUser = await insertTestUser()
    const otherUser = await insertTestUser()

    await expectOrpcError(
      callUpdateUser(
        { id: targetUser.id, name: targetUser.name, email: otherUser.email.toUpperCase() },
        await signInTestAdmin(),
      ),
      "EMAIL_TAKEN",
    )

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].email).toBe(targetUser.email)
  })

  it("rejects updating the email to an admin's email with EMAIL_TAKEN", async () => {
    const targetUser = await insertTestUser()
    const adminUser = await insertTestUser({ role: "admin" })

    await expectOrpcError(
      callUpdateUser(
        { id: targetUser.id, name: targetUser.name, email: adminUser.email },
        await signInTestAdmin(),
      ),
      "EMAIL_TAKEN",
    )

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].email).toBe(targetUser.email)
  })

  it("responds with HTTP 409 when the email is taken", async () => {
    const targetUser = await insertTestUser()
    const otherUser = await insertTestUser()
    const headers = await signInTestAdmin()
    headers.set("content-type", "application/json")

    const response = await app.request(`/api/users/${targetUser.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ name: "Updated Name", email: otherUser.email }),
    })

    expect(response.status).toBe(409)
  })

  it("rejects an unknown id with NOT_FOUND", async () => {
    await expectOrpcError(
      callUpdateUser(
        { id: `unknown-user-${randomUUID()}`, name: "Updated Name", email: createTestEmail() },
        await signInTestAdmin(),
      ),
      "NOT_FOUND",
    )
  })

  it("rejects an ordinary user with FORBIDDEN", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const targetUser = await insertTestUser()

    await expectOrpcError(
      callUpdateUser({ id: targetUser.id, name: "Updated Name", email: targetUser.email }, headers),
      "FORBIDDEN",
    )

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    expect(userRows[0].name).toBe(targetUser.name)
    expect(userRows[0].email).toBe(targetUser.email)
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the user update throws", async () => {
      const targetUser = await insertTestUser()
      vi.mocked(updateUser).mockRejectedValueOnce(new Error("Update failure"))
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: "Updated Name", email: targetUser.email }),
      })
      expect(response.status).toBe(500)
    })

    it("responds with HTTP 500 when the user update throws a duplicate email violation that is not a PostgresError", async () => {
      const targetUser = await insertTestUser()
      vi.mocked(updateUser).mockRejectedValueOnce(
        Object.assign(new Error("Duplicate email"), {
          code: "23505",
          constraint_name: "user_email_unique",
        }),
      )
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: "Updated Name", email: targetUser.email }),
      })
      expect(response.status).toBe(500)
    })

    it("responds with HTTP 500 when the user update throws a PostgresError that is not a unique violation", async () => {
      const targetUser = await insertTestUser()
      vi.mocked(updateUser).mockRejectedValueOnce(
        Object.assign(new postgres.PostgresError("Foreign key violation"), {
          code: "23503",
          constraint_name: "user_email_unique",
        }),
      )
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: "Updated Name", email: targetUser.email }),
      })
      expect(response.status).toBe(500)
    })

    it("responds with HTTP 500 when the user update throws a unique violation on another constraint", async () => {
      const targetUser = await insertTestUser()
      vi.mocked(updateUser).mockRejectedValueOnce(
        Object.assign(new postgres.PostgresError("Unique violation"), {
          code: "23505",
          constraint_name: "user_name_unique",
        }),
      )
      const headers = await signInTestAdmin()
      headers.set("content-type", "application/json")

      const response = await app.request(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: "Updated Name", email: targetUser.email }),
      })
      expect(response.status).toBe(500)
    })
  })
})
