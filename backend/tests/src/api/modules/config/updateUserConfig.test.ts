import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import { ConfigSchema, type UpdateConfig } from "@vancloak/api-contract"
import {
  Amneziawg3BrowserFingerprintSchema,
  Amneziawg3IntensitySchema,
  Amneziawg3ProtocolProfileSchema,
  ProtocolCodeSchema,
} from "@vancloak/infrastructure/shared"
import { RemoteServer } from "@vancloak/infrastructure"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest"
import app from "@/api/app.js"
import { PendingConfigReservationMinutes } from "@/api/modules/config-limit/queries/constants/PendingConfigReservationMinutes.js"
import { configRouter } from "@/api/modules/config/index.js"
import { updateUserConfig as updateUserConfigQuery } from "@/api/modules/config/queries/updateUserConfig.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { config, deviceType, protocol } from "@/core/database/schemas/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  createFakeAmneziawg3Client,
  createTestIp,
  insertTestConfig,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/config/queries/updateUserConfig.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/config/queries/updateUserConfig.js")>()
  return { updateUserConfig: vi.fn(original.updateUserConfig) }
})

let getProtocolClientSpy: MockInstance<RemoteServer["getProtocolClient"]>

function callUpdateUserConfig(input: unknown, headers: Headers) {
  return call(configRouter.updateUserConfig, input as UpdateConfig & { id: string }, {
    context: { headers },
  })
}

async function insertConfigPrerequisites(
  overrides: { protocol?: Partial<typeof protocol.$inferInsert> } = {},
) {
  const configProtocol = await insertTestProtocol(overrides.protocol)
  const configServer = await insertTestServer()
  const configEndpoint = await insertTestEndpoint({
    serverId: configServer.id,
    protocolId: configProtocol.id,
  })
  const [firstDeviceType, secondDeviceType] = await db.select().from(deviceType).limit(2)
  return { configProtocol, configEndpoint, firstDeviceType, secondDeviceType }
}

describe("PUT /configs/{id}", () => {
  beforeEach(async () => {
    const fakeAmneziawg3Client = createFakeAmneziawg3Client()
    getProtocolClientSpy = vi
      .spyOn(RemoteServer.prototype, "getProtocolClient")
      .mockReturnValue(fakeAmneziawg3Client.client)
    await bootstrapDeviceTypes()
  })

  it("updates the name and device type, keeps the config data, status and client identifier untouched, does not call the node and returns the config matching the contract schema", async () => {
    const { configProtocol, configEndpoint, firstDeviceType, secondDeviceType } =
      await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
      clientIdentifier: createTestIp(),
    })
    const pastUpdatedAt = new Date(Date.now() - 60 * 60 * 1000)
    await db
      .update(config)
      .set({ updatedAt: pastUpdatedAt })
      .where(eq(config.id, insertedConfig.id))

    const updatedConfig = await callUpdateUserConfig(
      { id: insertedConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
      headers,
    )

    const parsed = ConfigSchema.parse(updatedConfig)
    expect(parsed.id).toBe(insertedConfig.id)
    expect(parsed.name).toBe("Updated Config")
    expect(parsed.deviceType.id).toBe(secondDeviceType.id)
    expect(parsed.status).toBe("active")
    expect(parsed.data).toEqual(insertedConfig.data)
    expect(parsed.data.protocolCode).toBe(configProtocol.code)
    expect(parsed.endpoint.id).toBe(configEndpoint.id)
    expect(parsed.endpoint.protocol.code).toBe(configProtocol.code)
    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe("Updated Config")
    expect(configRows[0].deviceTypeId).toBe(secondDeviceType.id)
    expect(configRows[0].status).toBe("active")
    expect(configRows[0].data).toEqual(insertedConfig.data)
    expect(configRows[0].clientIdentifier).toBe(insertedConfig.clientIdentifier)
    expect(configRows[0].updatedAt.getTime()).toBeGreaterThan(pastUpdatedAt.getTime())
    expect(getProtocolClientSpy).not.toHaveBeenCalled()
  })

  it("rejects an unknown id with NOT_FOUND without changing any config row", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })

    await expectOrpcError(
      callUpdateUserConfig(
        { id: randomUUID(), name: "Updated Config", deviceTypeId: secondDeviceType.id },
        headers,
      ),
      "NOT_FOUND",
    )

    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(insertedConfig.name)
    expect(configRows[0].deviceTypeId).toBe(firstDeviceType.id)
    expect(configRows[0].updatedAt.getTime()).toBe(insertedConfig.updatedAt.getTime())
    expect(getProtocolClientSpy).not.toHaveBeenCalled()
  })

  it("rejects another user's config with NOT_FOUND and leaves it unchanged", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    const otherUserConfig = await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })

    await expectOrpcError(
      callUpdateUserConfig(
        { id: otherUserConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
        headers,
      ),
      "NOT_FOUND",
    )

    const configRows = await db.select().from(config).where(eq(config.id, otherUserConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(otherUserConfig.name)
    expect(configRows[0].deviceTypeId).toBe(firstDeviceType.id)
    expect(configRows[0].updatedAt.getTime()).toBe(otherUserConfig.updatedAt.getTime())
    expect(getProtocolClientSpy).not.toHaveBeenCalled()
  })

  it("rejects a deleting config with NOT_FOUND and leaves it unchanged", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const deletingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "deleting",
    })

    await expectOrpcError(
      callUpdateUserConfig(
        { id: deletingConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
        headers,
      ),
      "NOT_FOUND",
    )

    const configRows = await db.select().from(config).where(eq(config.id, deletingConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(deletingConfig.name)
    expect(configRows[0].deviceTypeId).toBe(firstDeviceType.id)
    expect(configRows[0].status).toBe("deleting")
    expect(configRows[0].updatedAt.getTime()).toBe(deletingConfig.updatedAt.getTime())
    expect(getProtocolClientSpy).not.toHaveBeenCalled()
  })

  it("rejects a pending config older than the reservation window with NOT_FOUND and leaves it unchanged", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const stalePendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PendingConfigReservationMinutes + 1) * 60 * 1000),
    })

    await expectOrpcError(
      callUpdateUserConfig(
        { id: stalePendingConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
        headers,
      ),
      "NOT_FOUND",
    )

    const configRows = await db.select().from(config).where(eq(config.id, stalePendingConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(stalePendingConfig.name)
    expect(configRows[0].deviceTypeId).toBe(firstDeviceType.id)
    expect(configRows[0].status).toBe("pending")
    expect(configRows[0].updatedAt.getTime()).toBe(stalePendingConfig.updatedAt.getTime())
    expect(getProtocolClientSpy).not.toHaveBeenCalled()
  })

  it("updates a pending config just inside the reservation window", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const pendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PendingConfigReservationMinutes - 1) * 60 * 1000),
    })

    const updatedConfig = await callUpdateUserConfig(
      { id: pendingConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
      headers,
    )

    const parsed = ConfigSchema.parse(updatedConfig)
    expect(parsed.id).toBe(pendingConfig.id)
    expect(parsed.name).toBe("Updated Config")
    expect(parsed.status).toBe("pending")
  })

  it("updates a config on an endpoint whose protocol is disabled", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites({
      protocol: { isEnabled: false },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const disabledProtocolConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })

    const updatedConfig = await callUpdateUserConfig(
      { id: disabledProtocolConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
      headers,
    )

    const parsed = ConfigSchema.parse(updatedConfig)
    expect(parsed.id).toBe(disabledProtocolConfig.id)
    expect(parsed.name).toBe("Updated Config")
  })

  it("rejects an unknown deviceTypeId with DEVICE_TYPE_INVALID and leaves the config unchanged", async () => {
    const { configEndpoint, firstDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })

    await expectOrpcError(
      callUpdateUserConfig(
        { id: insertedConfig.id, name: "Updated Config", deviceTypeId: randomUUID() },
        headers,
      ),
      "DEVICE_TYPE_INVALID",
    )

    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(insertedConfig.name)
    expect(configRows[0].deviceTypeId).toBe(firstDeviceType.id)
    expect(configRows[0].updatedAt.getTime()).toBe(insertedConfig.updatedAt.getTime())
    expect(getProtocolClientSpy).not.toHaveBeenCalled()
  })

  it("rejects a disabled device type with DEVICE_TYPE_INVALID and leaves the config unchanged", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })
    await db
      .update(deviceType)
      .set({ isEnabled: false })
      .where(eq(deviceType.id, secondDeviceType.id))

    await expectOrpcError(
      callUpdateUserConfig(
        { id: insertedConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
        headers,
      ),
      "DEVICE_TYPE_INVALID",
    )

    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(insertedConfig.name)
    expect(configRows[0].deviceTypeId).toBe(firstDeviceType.id)
    expect(configRows[0].updatedAt.getTime()).toBe(insertedConfig.updatedAt.getTime())
    expect(getProtocolClientSpy).not.toHaveBeenCalled()
  })

  it("responds with HTTP 400 when the deviceTypeId is unknown", async () => {
    const { configEndpoint, firstDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })
    headers.set("content-type", "application/json")

    const response = await app.request(`/api/configs/${insertedConfig.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ name: "Updated Config", deviceTypeId: randomUUID() }),
    })

    expect(response.status).toBe(400)
  })

  it("leaves the stored config data unchanged when the body carries protocolOptions", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })

    const updatedConfig = await callUpdateUserConfig(
      {
        id: insertedConfig.id,
        name: "Updated Config",
        deviceTypeId: secondDeviceType.id,
        protocolOptions: {
          protocolCode: ProtocolCodeSchema.enum.amneziawg3,
          browserFingerprint: Amneziawg3BrowserFingerprintSchema.enum.firefox,
        },
      },
      headers,
    )

    const parsed = ConfigSchema.parse(updatedConfig)
    expect(parsed.name).toBe("Updated Config")
    expect(parsed.data).toEqual(insertedConfig.data)
    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows[0].data).toEqual(insertedConfig.data)
  })

  it("leaves the user's other config untouched on a successful update", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const updatedConfigRow = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })
    const siblingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })

    await callUpdateUserConfig(
      { id: updatedConfigRow.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
      headers,
    )

    const configRows = await db.select().from(config).where(eq(config.id, siblingConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(siblingConfig.name)
    expect(configRows[0].deviceTypeId).toBe(firstDeviceType.id)
    expect(configRows[0].updatedAt.getTime()).toBe(siblingConfig.updatedAt.getTime())
  })

  it("leaves another user's config untouched on a successful update", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    const requestUserConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })
    const otherUserConfig = await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })

    await callUpdateUserConfig(
      { id: requestUserConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
      headers,
    )

    const configRows = await db.select().from(config).where(eq(config.id, otherUserConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(otherUserConfig.name)
    expect(configRows[0].deviceTypeId).toBe(firstDeviceType.id)
    expect(configRows[0].updatedAt.getTime()).toBe(otherUserConfig.updatedAt.getTime())
  })

  it("allows an admin user as well", async () => {
    const { configEndpoint, firstDeviceType, secondDeviceType } = await insertConfigPrerequisites()
    const adminUser = await insertTestUser({ role: "admin" })
    const headers = await insertTestSession(adminUser)
    const adminConfig = await insertTestConfig({
      userId: adminUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: firstDeviceType.id,
      status: "active",
    })

    const updatedConfig = await callUpdateUserConfig(
      { id: adminConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
      headers,
    )

    const parsed = ConfigSchema.parse(updatedConfig)
    expect(parsed.name).toBe("Updated Config")
  })

  describe("amneziawg3", () => {
    it("returns exactly the amneziawg3 config data fields", async () => {
      const { configEndpoint, firstDeviceType, secondDeviceType } =
        await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      const insertedConfig = await insertTestConfig({
        userId: requestUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: firstDeviceType.id,
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

      const updatedConfig = await callUpdateUserConfig(
        { id: insertedConfig.id, name: "Updated Config", deviceTypeId: secondDeviceType.id },
        headers,
      )

      const parsed = ConfigSchema.parse(updatedConfig)
      expect(parsed.data).toEqual(insertedConfig.data)
      expect(Object.keys(updatedConfig.data).sort()).toEqual([
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
    it("responds with HTTP 500 when the config update query throws", async () => {
      vi.mocked(updateUserConfigQuery).mockRejectedValueOnce(new Error("Update failure"))
      const { configEndpoint, firstDeviceType, secondDeviceType } =
        await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      const insertedConfig = await insertTestConfig({
        userId: requestUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: firstDeviceType.id,
        status: "active",
      })
      headers.set("content-type", "application/json")

      const response = await app.request(`/api/configs/${insertedConfig.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: "Updated Config", deviceTypeId: secondDeviceType.id }),
      })

      expect(response.status).toBe(500)
    })
  })
})
