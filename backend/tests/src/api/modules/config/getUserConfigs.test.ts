import { call } from "@orpc/server"
import { ConfigSchema } from "@vancloak/api-contract"
import {
  Amneziawg3BrowserFingerprintSchema,
  Amneziawg3IntensitySchema,
  Amneziawg3ProtocolProfileSchema,
  ProtocolCodeSchema,
} from "@vancloak/infrastructure/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import app from "@/api/app.js"
import { PendingConfigReservationMinutes } from "@/api/modules/config-limit/queries/constants/PendingConfigReservationMinutes.js"
import { configRouter } from "@/api/modules/config/index.js"
import { findUserConfigs } from "@/api/modules/config/queries/findUserConfigs.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { deviceType, protocol, server } from "@/core/database/schemas/index.js"
import {
  insertTestConfig,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/config/queries/findUserConfigs.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/config/queries/findUserConfigs.js")>()
  return { findUserConfigs: vi.fn(original.findUserConfigs) }
})

function callGetUserConfigs(headers: Headers) {
  return call(configRouter.getUserConfigs, undefined, { context: { headers } })
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

describe("GET /configs", () => {
  beforeEach(bootstrapDeviceTypes)

  it("returns the requesting user's configs matching the contract schema with the joined endpoint, server, protocol and device type values", async () => {
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

    const configs = await callGetUserConfigs(headers)

    const parsed = z.array(ConfigSchema).parse(configs)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe(insertedConfig.id)
    expect(parsed[0].name).toBe(insertedConfig.name)
    expect(parsed[0].status).toBe("active")
    expect(parsed[0].data).toEqual(insertedConfig.data)
    expect(parsed[0].deviceType.id).toBe(configDeviceType.id)
    expect(parsed[0].deviceType.code).toBe(configDeviceType.code)
    expect(parsed[0].deviceType.name).toBe(configDeviceType.name)
    expect(parsed[0].endpoint.id).toBe(configEndpoint.id)
    expect(parsed[0].endpoint.port).toBe(configEndpoint.port)
    expect(parsed[0].endpoint.protocol.code).toBe(configProtocol.code)
    expect(parsed[0].endpoint.protocol.family).toBe(configProtocol.family)
    expect(parsed[0].endpoint.protocol.name).toBe(configProtocol.name)
    expect(parsed[0].endpoint.server.id).toBe(configServer.id)
    expect(parsed[0].endpoint.server.name).toBe(configServer.name)
    expect(parsed[0].endpoint.server.country).toBe(configServer.country)
  })

  it("returns each config with its own server", async () => {
    const configProtocol = await insertTestProtocol()
    const firstServer = await insertTestServer()
    const secondServer = await insertTestServer()
    const firstEndpoint = await insertTestEndpoint({
      serverId: firstServer.id,
      protocolId: configProtocol.id,
    })
    const secondEndpoint = await insertTestEndpoint({
      serverId: secondServer.id,
      protocolId: configProtocol.id,
    })
    const [configDeviceType] = await db.select().from(deviceType).limit(1)
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const firstConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: firstEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    const secondConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: secondEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const configs = await callGetUserConfigs(headers)

    const parsed = z.array(ConfigSchema).parse(configs)
    const serverNamesByConfigId = new Map(
      parsed.map((entry) => [entry.id, entry.endpoint.server.name]),
    )
    expect(serverNamesByConfigId.get(firstConfig.id)).toBe(firstServer.name)
    expect(serverNamesByConfigId.get(secondConfig.id)).toBe(secondServer.name)
  })

  it("returns an empty array when the user has no configs", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    const configs = await callGetUserConfigs(headers)

    expect(configs).toEqual([])
  })

  it("does not return another user's configs", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    const requestUserConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })
    await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    const configs = await callGetUserConfigs(headers)

    const parsed = z.array(ConfigSchema).parse(configs)
    expect(parsed.map((entry) => entry.id)).toEqual([requestUserConfig.id])
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

    const configs = await callGetUserConfigs(headers)

    const parsed = z.array(ConfigSchema).parse(configs)
    expect(parsed.map((entry) => entry.id)).toEqual([pendingConfig.id])
    expect(parsed[0].status).toBe("pending")
  })

  it("hides a pending config older than the reservation window", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PendingConfigReservationMinutes + 1) * 60 * 1000),
    })

    const configs = await callGetUserConfigs(headers)

    expect(configs).toEqual([])
  })

  it("hides a deleting config", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "deleting",
    })

    const configs = await callGetUserConfigs(headers)

    expect(configs).toEqual([])
  })

  it("returns configs on an endpoint whose protocol is disabled", async () => {
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

    const configs = await callGetUserConfigs(headers)

    const parsed = z.array(ConfigSchema).parse(configs)
    expect(parsed.map((entry) => entry.id)).toEqual([disabledProtocolConfig.id])
  })

  it("returns the configs ordered by creation date, newest first", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const oldestConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    })
    const newestConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    })
    const middleConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    })

    const configs = await callGetUserConfigs(headers)

    const parsed = z.array(ConfigSchema).parse(configs)
    expect(parsed.map((entry) => entry.id)).toEqual([
      newestConfig.id,
      middleConfig.id,
      oldestConfig.id,
    ])
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

    const configs = await callGetUserConfigs(headers)

    const parsed = z.array(ConfigSchema).parse(configs)
    expect(parsed.map((entry) => entry.id)).toEqual([adminConfig.id])
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
          splitTunneling: null,
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

      const configs = await callGetUserConfigs(headers)

      const parsed = z.array(ConfigSchema).parse(configs)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].data).toEqual(insertedConfig.data)
      expect(Object.keys(configs[0].data).sort()).toEqual([
        "clientIp",
        "options",
        "presharedKey",
        "protocolCode",
        "publicKey",
        "splitTunneling",
      ])
    })
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the configs query throws", async () => {
      vi.mocked(findUserConfigs).mockRejectedValueOnce(new Error("Query failure"))
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const response = await app.request("/api/configs", { headers })

      expect(response.status).toBe(500)
    })
  })
})
