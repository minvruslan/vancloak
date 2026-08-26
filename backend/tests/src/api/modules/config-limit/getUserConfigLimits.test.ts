import { call } from "@orpc/server"
import { ConfigLimitSchema } from "@vancloak/api-contract"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import app from "@/api/app.js"
import { configLimitRouter } from "@/api/modules/config-limit/index.js"
import { PendingConfigReservationMinutes } from "@/api/modules/config-limit/queries/constants/PendingConfigReservationMinutes.js"
import { findUserConfigLimits } from "@/api/modules/config-limit/queries/findUserConfigLimits.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { config, deviceType, protocol } from "@/core/database/schemas/index.js"
import {
  insertTestConfig,
  insertTestConfigLimit,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/config-limit/queries/findUserConfigLimits.js", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/api/modules/config-limit/queries/findUserConfigLimits.js")
    >()
  return { findUserConfigLimits: vi.fn(original.findUserConfigLimits) }
})

function callGetUserConfigLimits(headers: Headers) {
  return call(configLimitRouter.getUserConfigLimits, undefined, { context: { headers } })
}

async function insertConfigPrerequisites(
  protocolOverrides: Partial<typeof protocol.$inferInsert> = {},
) {
  const configProtocol = await insertTestProtocol(protocolOverrides)
  const configServer = await insertTestServer()
  const configEndpoint = await insertTestEndpoint({
    serverId: configServer.id,
    protocolId: configProtocol.id,
  })
  const [configDeviceType] = await db.select().from(deviceType).limit(1)
  return { configEndpoint, configDeviceType }
}

describe("GET /config-limits", () => {
  beforeEach(bootstrapDeviceTypes)

  it("returns the requesting user's config limits matching the contract schema", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfigLimit = await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe(insertedConfigLimit.id)
    expect(parsed[0].protocolFamily).toBe(ProtocolRegistry.amneziawg3.family)
    expect(parsed[0].maxCount).toBe(3)
    expect(parsed[0].used).toBe(0)
  })

  it("returns used as the number of the user's slot-reserving configs in the limit's protocol family", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 5,
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].used).toBe(2)
  })

  it("returns used as zero when the user has no configs", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].used).toBe(0)
  })

  it("counts pending configs younger than the reservation window toward used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].used).toBe(1)
  })

  it("excludes pending configs older than the reservation window from used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })
    const stalePendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
    })
    await db
      .update(config)
      .set({
        createdAt: new Date(Date.now() - (PendingConfigReservationMinutes + 1) * 60 * 1000),
      })
      .where(eq(config.id, stalePendingConfig.id))

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].used).toBe(0)
  })

  it("excludes deleting configs from used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "deleting",
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].used).toBe(0)
  })

  it("counts configs whose protocol is disabled toward used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      isEnabled: false,
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].used).toBe(1)
  })

  it("returns used equal to maxCount when the limit is exactly reached", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 2,
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].maxCount).toBe(2)
    expect(parsed[0].used).toBe(2)
  })

  it("returns used greater than maxCount when the database holds more configs than the limit allows", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 1,
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].maxCount).toBe(1)
    expect(parsed[0].used).toBe(2)
  })

  it("returns a limit with maxCount zero as stored", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 0,
    })

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].maxCount).toBe(0)
  })

  it("returns an empty array when the user has no config limit rows", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    const configLimits = await callGetUserConfigLimits(headers)

    expect(configLimits).toEqual([])
  })

  it.todo("returns entries ordered by protocol family ascending")

  it("excludes another user's configs from used", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })
    await insertTestConfig({
      userId: requestUser.id,
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

    const configLimits = await callGetUserConfigLimits(headers)

    const parsed = z.array(ConfigLimitSchema).parse(configLimits)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].used).toBe(1)
  })

  it("omits limits that belong to another user", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    const requestUserConfigLimit = await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })
    await insertTestConfigLimit({
      userId: otherUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })

    const configLimits = await callGetUserConfigLimits(headers)

    expect(configLimits.map((entry) => entry.id)).toEqual([requestUserConfigLimit.id])
  })

  it("allows an admin user as well", async () => {
    const adminUser = await insertTestUser({ role: "admin" })
    const headers = await insertTestSession(adminUser)
    const adminConfigLimit = await insertTestConfigLimit({
      userId: adminUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })

    const configLimits = await callGetUserConfigLimits(headers)

    expect(configLimits.map((entry) => entry.id)).toEqual([adminConfigLimit.id])
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the config limit query throws", async () => {
      vi.mocked(findUserConfigLimits).mockRejectedValueOnce(new Error("Query failure"))

      const requestUser = await insertTestUser()

      const response = await app.request("/api/config-limits", {
        headers: await insertTestSession(requestUser),
      })
      expect(response.status).toBe(500)
    })
  })
})
