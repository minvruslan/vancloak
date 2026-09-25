import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import { ConfigSchema } from "@vancloak/api-contract"
import {
  Amneziawg3BrowserFingerprintSchema,
  Amneziawg3IntensitySchema,
  Amneziawg3ProtocolProfileSchema,
  ProtocolCodeSchema,
} from "@vancloak/infrastructure/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import app from "@/api/app.js"
import { PendingConfigReservationMinutes } from "@/api/modules/config-limit/queries/constants/PendingConfigReservationMinutes.js"
import { configRouter } from "@/api/modules/config/index.js"
import { findUserConfig } from "@/api/modules/config/queries/findUserConfig.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { deviceType, protocol, server } from "@/core/database/schemas/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  insertTestConfig,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/config/queries/findUserConfig.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/config/queries/findUserConfig.js")>()
  return { findUserConfig: vi.fn(original.findUserConfig) }
})

function callGetUserConfig(headers: Headers, id: string) {
  return call(configRouter.getUserConfig, { id }, { context: { headers } })
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
  return { configProtocol, configServer, configEndpoint, configDeviceType }
}

describe("GET /configs/{id}", () => {
  beforeEach(bootstrapDeviceTypes)

  it("returns the user's config matching the contract schema with the joined endpoint, server, protocol and device type values", async () => {
    const { configProtocol, configServer, configEndpoint, configDeviceType } =
      await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    const requestedConfig = await callGetUserConfig(headers, insertedConfig.id)

    const parsed = ConfigSchema.parse(requestedConfig)
    expect(parsed.id).toBe(insertedConfig.id)
    expect(parsed.name).toBe(insertedConfig.name)
    expect(parsed.status).toBe("active")
    expect(parsed.data).toEqual(insertedConfig.data)
    expect(parsed.deviceType.id).toBe(configDeviceType.id)
    expect(parsed.deviceType.code).toBe(configDeviceType.code)
    expect(parsed.deviceType.name).toBe(configDeviceType.name)
    expect(parsed.endpoint.id).toBe(configEndpoint.id)
    expect(parsed.endpoint.port).toBe(configEndpoint.port)
    expect(parsed.endpoint.protocol.code).toBe(configProtocol.code)
    expect(parsed.endpoint.protocol.family).toBe(configProtocol.family)
    expect(parsed.endpoint.protocol.name).toBe(configProtocol.name)
    expect(parsed.endpoint.server?.id).toBe(configServer.id)
    expect(parsed.endpoint.server?.name).toBe(configServer.name)
    expect(parsed.endpoint.server?.country).toBe(configServer.country)
  })

  it("rejects an unknown id with NOT_FOUND", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(callGetUserConfig(headers, randomUUID()), "NOT_FOUND")
  })

  it("rejects another user's config with NOT_FOUND", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    const otherUserConfig = await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    await expectOrpcError(callGetUserConfig(headers, otherUserConfig.id), "NOT_FOUND")
  })

  it("rejects a deleting config with NOT_FOUND", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const deletingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "deleting",
    })

    await expectOrpcError(callGetUserConfig(headers, deletingConfig.id), "NOT_FOUND")
  })

  it("rejects a pending config older than the reservation window with NOT_FOUND", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const stalePendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PendingConfigReservationMinutes + 1) * 60 * 1000),
    })

    await expectOrpcError(callGetUserConfig(headers, stalePendingConfig.id), "NOT_FOUND")
  })

  it("returns a pending config just inside the reservation window", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const pendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PendingConfigReservationMinutes - 1) * 60 * 1000),
    })

    const requestedConfig = await callGetUserConfig(headers, pendingConfig.id)

    const parsed = ConfigSchema.parse(requestedConfig)
    expect(parsed.id).toBe(pendingConfig.id)
    expect(parsed.status).toBe("pending")
  })

  it("returns a config on an endpoint whose protocol is disabled", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      protocol: { isEnabled: false },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const disabledProtocolConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    const requestedConfig = await callGetUserConfig(headers, disabledProtocolConfig.id)

    const parsed = ConfigSchema.parse(requestedConfig)
    expect(parsed.id).toBe(disabledProtocolConfig.id)
  })

  it("allows an admin user as well", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const adminUser = await insertTestUser({ role: "admin" })
    const headers = await insertTestSession(adminUser)
    const adminConfig = await insertTestConfig({
      userId: adminUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    const requestedConfig = await callGetUserConfig(headers, adminConfig.id)

    const parsed = ConfigSchema.parse(requestedConfig)
    expect(parsed.id).toBe(adminConfig.id)
  })

  describe("amneziawg3", () => {
    it("returns exactly the amneziawg3 config data fields", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      const insertedConfig = await insertTestConfig({
        userId: requestUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
        status: "active",
        data: {
          protocolCode: ProtocolCodeSchema.enum.amneziawg3,
          clientIp: "10.8.0.2",
          publicKey: "test-public-key",
          presharedKey: "test-preshared-key",
          options: {
            protocolProfile: Amneziawg3ProtocolProfileSchema.enum.quic_initial,
            browserFingerprint: Amneziawg3BrowserFingerprintSchema.enum.firefox,
            junkPacketCount: Amneziawg3IntensitySchema.enum.high,
            junkPacketSize: Amneziawg3IntensitySchema.enum.low,
            noisePackets: Amneziawg3IntensitySchema.enum.medium,
          },
        },
      })

      const requestedConfig = await callGetUserConfig(headers, insertedConfig.id)

      const parsed = ConfigSchema.parse(requestedConfig)
      expect(parsed.data).toEqual(insertedConfig.data)
      expect(Object.keys(requestedConfig.data).sort()).toEqual([
        "clientIp",
        "options",
        "presharedKey",
        "protocolCode",
        "publicKey",
      ])
    })
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the config query throws", async () => {
      vi.mocked(findUserConfig).mockRejectedValueOnce(new Error("Query failure"))
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const response = await app.request(`/api/configs/${randomUUID()}`, { headers })

      expect(response.status).toBe(500)
    })
  })
})
