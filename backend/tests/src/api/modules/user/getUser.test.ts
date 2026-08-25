import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import { UserSchema } from "@vancloak/api-contract"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import app from "@/api/app.js"
import { PendingConfigReservationMinutes } from "@/api/modules/config-limit/queries/constants/PendingConfigReservationMinutes.js"
import { userRouter } from "@/api/modules/user/index.js"
import { findUserById } from "@/api/modules/user/queries/findUserById.js"
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

vi.mock("@/api/modules/user/queries/findUserById.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/user/queries/findUserById.js")>()
  return { findUserById: vi.fn(original.findUserById) }
})

function callGetUser(id: string, headers: Headers) {
  return call(userRouter.getUser, { id }, { context: { headers } })
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

describe("GET /users/{id}", () => {
  beforeEach(bootstrapDeviceTypes)

  it("returns the requested user matching the contract schema", async () => {
    const requestedUser = await insertTestUser()

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    const parsed = UserSchema.parse(foundUser)
    expect(parsed.id).toBe(requestedUser.id)
    expect(parsed.name).toBe(requestedUser.name)
    expect(parsed.email).toBe(requestedUser.email)
  })

  it("returns every contract field at every nesting level", async () => {
    const requestedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: requestedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 3,
    })

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    expect(Object.keys(foundUser).sort()).toEqual([
      "banReason",
      "banned",
      "createdAt",
      "email",
      "id",
      "limits",
      "name",
      "role",
    ])
    expect(foundUser.limits).toHaveLength(1)
    for (const limit of foundUser.limits) {
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

  it("returns the user's limits with used counting their slot-reserving configs of the matching protocol family", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: requestedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 5,
    })
    for (const status of ["active", "pending", "deleting"] as const) {
      await insertTestConfig({
        userId: requestedUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
        status,
      })
    }

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    expect(foundUser.limits).toHaveLength(1)
    for (const limit of foundUser.limits) {
      expect(limit.protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
      expect(limit.maxCount).toBe(5)
      expect(limit.used).toBe(2)
    }
  })

  it("excludes a pending config older than the reservation window from used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: requestedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 5,
    })
    await insertTestConfig({
      userId: requestedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PendingConfigReservationMinutes + 1) * 60 * 1000),
    })

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    expect(foundUser.limits).toHaveLength(1)
    for (const limit of foundUser.limits) {
      expect(limit.used).toBe(0)
    }
  })

  it("returns an empty limits array when the user has no config limits", async () => {
    const requestedUser = await insertTestUser()

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    expect(foundUser.limits).toEqual([])
  })

  it("returns a banned user with banned and banReason populated", async () => {
    const bannedUser = await insertTestUser({ banned: true, banReason: "Violation of terms" })

    const foundUser = await callGetUser(bannedUser.id, await signInTestAdmin())

    const parsed = UserSchema.parse(foundUser)
    expect(parsed.banned).toBe(true)
    expect(parsed.banReason).toBe("Violation of terms")
  })

  it("rejects a user with role admin with NOT_FOUND", async () => {
    const adminUser = await insertTestUser({ role: "admin" })

    await expectOrpcError(callGetUser(adminUser.id, await signInTestAdmin()), "NOT_FOUND")
  })

  it("returns a limit with used exceeding maxCount as-is parsing against the contract schema", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: requestedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 1,
    })
    await insertTestConfig({
      userId: requestedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    await insertTestConfig({
      userId: requestedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    const parsed = UserSchema.parse(foundUser)
    expect(parsed.limits).toHaveLength(1)
    for (const limit of parsed.limits) {
      expect(limit.maxCount).toBe(1)
      expect(limit.used).toBe(2)
    }
  })

  it("returns a limit with maxCount 0 and a positive used count", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: requestedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 0,
    })
    await insertTestConfig({
      userId: requestedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    expect(foundUser.limits).toHaveLength(1)
    for (const limit of foundUser.limits) {
      expect(limit.maxCount).toBe(0)
      expect(limit.used).toBe(1)
    }
  })

  it("omits usage of a protocol family that has no config limit row from limits", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestedUser = await insertTestUser()
    await insertTestConfig({
      userId: requestedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    expect(foundUser.limits).toEqual([])
  })

  it("counts a config on a disabled protocol in used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      protocol: { isEnabled: false },
    })
    const requestedUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: requestedUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 2,
    })
    await insertTestConfig({
      userId: requestedUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const foundUser = await callGetUser(requestedUser.id, await signInTestAdmin())

    expect(foundUser.limits).toHaveLength(1)
    for (const limit of foundUser.limits) {
      expect(limit.protocolFamily).toBe(ProtocolRegistry.amneziawg2.family)
      expect(limit.maxCount).toBe(2)
      expect(limit.used).toBe(1)
    }
  })

  it("rejects an unknown id with NOT_FOUND", async () => {
    await expectOrpcError(
      callGetUser(`unknown-user-${randomUUID()}`, await signInTestAdmin()),
      "NOT_FOUND",
    )
  })

  it("rejects an ordinary user with FORBIDDEN", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const requestedUser = await insertTestUser()

    await expectOrpcError(callGetUser(requestedUser.id, headers), "FORBIDDEN")
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the user query throws", async () => {
      const requestedUser = await insertTestUser()
      vi.mocked(findUserById).mockRejectedValueOnce(new Error("Query failure"))

      const response = await app.request(`/api/users/${requestedUser.id}`, {
        headers: await signInTestAdmin(),
      })
      expect(response.status).toBe(500)
    })
  })
})
