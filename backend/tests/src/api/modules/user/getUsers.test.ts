import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import { UserSchema } from "@vancloak/api-contract"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import app from "@/api/app.js"
import { PENDING_CONFIG_RESERVATION_MINUTES } from "@/api/modules/config-limit/queries/constants/PENDING_CONFIG_RESERVATION_MINUTES.js"
import { userRouter } from "@/api/modules/user/index.js"
import { findUsers } from "@/api/modules/user/queries/findUsers.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { deviceType, protocol, server } from "@/core/database/schemas/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  insertTestConfig,
  insertTestConfigLimit,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
  signInTestAdmin,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/user/queries/findUsers.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/modules/user/queries/findUsers.js")>()
  return { findUsers: vi.fn(original.findUsers) }
})

function callGetUsers(headers: Headers) {
  return call(userRouter.getUsers, undefined, { context: { headers } })
}

async function insertConfigPrerequisites(
  overrides: {
    protocol?: Partial<typeof protocol.$inferInsert>
    server?: Partial<typeof server.$inferInsert>
  } = {},
) {
  const configProtocol = await insertTestProtocol(overrides.protocol)
  const configServer = await insertTestServer(overrides.server)
  const configEndpoint = await insertTestEndpoint({
    serverId: configServer.id,
    protocolId: configProtocol.id,
  })
  const [configDeviceType] = await db.select().from(deviceType).limit(1)
  return { configEndpoint, configDeviceType }
}

describe("GET /users", () => {
  beforeEach(bootstrapDeviceTypes)

  it("returns all users matching the contract schema", async () => {
    const firstUser = await insertTestUser()
    const secondUser = await insertTestUser()

    const users = await callGetUsers(await signInTestAdmin())

    const parsed = z.array(UserSchema).parse(users)
    const parsedIds = parsed.map((entry) => entry.id)
    expect(parsedIds).toContain(firstUser.id)
    expect(parsedIds).toContain(secondUser.id)
  })

  it("returns every contract field at every nesting level", async () => {
    const listedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: listedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 3,
    })

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === listedUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual([
        "banReason",
        "banned",
        "createdAt",
        "email",
        "id",
        "limits",
        "name",
        "role",
      ])
      expect(entry.limits).toHaveLength(1)
      for (const limit of entry.limits) {
        expect(Object.keys(limit).sort()).toEqual([
          "createdAt",
          "id",
          "maxCount",
          "protocolFamily",
          "updatedAt",
          "used",
        ])
      }
    }
  })

  it("returns each user's own limits", async () => {
    const firstUser = await insertTestUser()
    const secondUser = await insertTestUser()
    const thirdUser = await insertTestUser()
    const firstConfigLimit = await insertTestConfigLimit({
      userId: firstUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 1,
    })
    const secondConfigLimit = await insertTestConfigLimit({
      userId: secondUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 2,
    })

    const users = await callGetUsers(await signInTestAdmin())

    const entriesById = new Map(users.map((entry) => [entry.id, entry]))
    expect(entriesById.get(firstUser.id)?.limits).toEqual([
      expect.objectContaining({ id: firstConfigLimit.id, maxCount: 1 }),
    ])
    expect(entriesById.get(secondUser.id)?.limits).toEqual([
      expect.objectContaining({ id: secondConfigLimit.id, maxCount: 2 }),
    ])
    expect(entriesById.get(thirdUser.id)?.limits).toEqual([])
  })

  it("omits users with role admin including the requesting admin from the list", async () => {
    const adminUser = await insertTestUser({ role: "admin" })
    const headers = await insertTestSession(adminUser)
    const otherAdminUser = await insertTestUser({ role: "admin" })
    const ordinaryUser = await insertTestUser()

    const users = await callGetUsers(headers)

    const listedIds = users.map((entry) => entry.id)
    expect(listedIds).toContain(ordinaryUser.id)
    expect(listedIds).not.toContain(adminUser.id)
    expect(listedIds).not.toContain(otherAdminUser.id)
  })

  it("returns an empty array when only admin users exist", async () => {
    const users = await callGetUsers(await signInTestAdmin())

    expect(users).toEqual([])
  })

  it("returns a user with null role, banned and banReason parsing against the schema", async () => {
    const nullFieldsUser = await insertTestUser({ role: null, banned: null, banReason: null })

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === nullFieldsUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      const parsed = UserSchema.parse(entry)
      expect(parsed.role).toBeNull()
      expect(parsed.banned).toBeNull()
      expect(parsed.banReason).toBeNull()
    }
  })

  it("returns a banned user with banned and banReason populated", async () => {
    const bannedUser = await insertTestUser({ banned: true, banReason: "Violation of terms" })

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === bannedUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      const parsed = UserSchema.parse(entry)
      expect(parsed.banned).toBe(true)
      expect(parsed.banReason).toBe("Violation of terms")
    }
  })

  it("returns each limit with used counting the user's slot-reserving configs of the matching protocol family", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const limitedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: limitedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 5,
    })
    for (const status of ["active", "pending", "deleting"] as const) {
      await insertTestConfig({
        userId: limitedUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
        status,
      })
    }

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === limitedUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      expect(entry.limits).toHaveLength(1)
      for (const limit of entry.limits) {
        expect(limit.protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
        expect(limit.maxCount).toBe(5)
        expect(limit.used).toBe(2)
      }
    }
  })

  it("excludes a pending config older than the reservation window from used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const limitedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: limitedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 5,
    })
    await insertTestConfig({
      userId: limitedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PENDING_CONFIG_RESERVATION_MINUTES + 1) * 60 * 1000),
    })

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === limitedUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      expect(entry.limits).toHaveLength(1)
      for (const limit of entry.limits) {
        expect(limit.used).toBe(0)
      }
    }
  })

  it("does not count another user's configs in the used value", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const limitedUser = await insertTestUser()
    const otherUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: limitedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 5,
    })
    await insertTestConfig({
      userId: limitedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === limitedUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      expect(entry.limits).toHaveLength(1)
      for (const limit of entry.limits) {
        expect(limit.used).toBe(1)
      }
    }
  })

  it("returns a limit with used exceeding maxCount as-is parsing against the contract schema", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const overLimitUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: overLimitUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 1,
    })
    await insertTestConfig({
      userId: overLimitUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    await insertTestConfig({
      userId: overLimitUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === overLimitUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      const parsed = UserSchema.parse(entry)
      expect(parsed.limits).toHaveLength(1)
      for (const limit of parsed.limits) {
        expect(limit.maxCount).toBe(1)
        expect(limit.used).toBe(2)
      }
    }
  })

  it("omits usage of a protocol family that has no config limit row from the user's limits", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const unlimitedUser = await insertTestUser()
    await insertTestConfig({
      userId: unlimitedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === unlimitedUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      expect(entry.limits).toEqual([])
    }
  })

  it("counts a config on a disabled protocol in used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      protocol: { isEnabled: false },
    })
    const limitedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: limitedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 2,
    })
    await insertTestConfig({
      userId: limitedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const users = await callGetUsers(await signInTestAdmin())

    const entries = users.filter((entry) => entry.id === limitedUser.id)
    expect(entries).toHaveLength(1)
    for (const entry of entries) {
      expect(entry.limits).toHaveLength(1)
      for (const limit of entry.limits) {
        expect(limit.protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
        expect(limit.maxCount).toBe(2)
        expect(limit.used).toBe(1)
      }
    }
  })

  it("returns entries ordered by name ascending", async () => {
    const bravoUser = await insertTestUser({ name: `Bravo User ${randomUUID()}` })
    const charlieUser = await insertTestUser({ name: `Charlie User ${randomUUID()}` })
    const alphaUser = await insertTestUser({ name: `Alpha User ${randomUUID()}` })
    const orderedUserIds = [alphaUser.id, bravoUser.id, charlieUser.id]

    const users = await callGetUsers(await signInTestAdmin())

    const listedIds = users
      .filter((entry) => orderedUserIds.includes(entry.id))
      .map((entry) => entry.id)
    expect(listedIds).toEqual(orderedUserIds)
  })

  it("rejects an ordinary user with FORBIDDEN", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(callGetUsers(headers), "FORBIDDEN")
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the user query throws", async () => {
      vi.mocked(findUsers).mockRejectedValueOnce(new Error("Query failure"))

      const response = await app.request("/api/users", {
        headers: await signInTestAdmin(),
      })
      expect(response.status).toBe(500)
    })
  })
})
