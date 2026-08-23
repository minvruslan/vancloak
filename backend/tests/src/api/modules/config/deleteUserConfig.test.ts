import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import { ConfigSchema, type UpsertConfig } from "@vancloak/api-contract"
import {
  Amneziawg2ObfuscationDefaults,
  ProtocolCodeSchema,
  ProtocolRegistry,
} from "@vancloak/infrastructure/shared"
import { RemoteServer } from "@vancloak/infrastructure"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest"
import { z } from "zod"
import app from "@/api/app.js"
import { PENDING_CONFIG_RESERVATION_MINUTES } from "@/api/modules/config-limit/queries/constants/PENDING_CONFIG_RESERVATION_MINUTES.js"
import { configRouter } from "@/api/modules/config/index.js"
import { findDeletableUserConfigs } from "@/api/modules/config/queries/findDeletableUserConfigs.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { config, deviceType, endpoint, protocol, server } from "@/core/database/schemas/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  createFakeAmneziawg2Client,
  createTestIp,
  FakeAmneziawg2EndpointActualState,
  insertTestConfig,
  insertTestConfigLimit,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/config/queries/findDeletableUserConfigs.js", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/api/modules/config/queries/findDeletableUserConfigs.js")
    >()
  return { findDeletableUserConfigs: vi.fn(original.findDeletableUserConfigs) }
})

const DeleteUserConfigOutputSchema = z.object({ id: z.uuid() })

let fakeAmneziawg2Client: ReturnType<typeof createFakeAmneziawg2Client>
let getProtocolClientSpy: MockInstance<RemoteServer["getProtocolClient"]>

function callDeleteUserConfig(headers: Headers, id: string) {
  return call(configRouter.deleteUserConfig, { id }, { context: { headers } })
}

async function insertConfigPrerequisites(
  overrides: {
    protocol?: Partial<typeof protocol.$inferInsert>
    server?: Partial<typeof server.$inferInsert>
    endpoint?: Partial<typeof endpoint.$inferInsert>
  } = {},
) {
  const configProtocol = await insertTestProtocol(overrides.protocol)
  const configServer = await insertTestServer(overrides.server)
  const configEndpoint = await insertTestEndpoint({
    serverId: configServer.id,
    protocolId: configProtocol.id,
    ...overrides.endpoint,
  })
  const [configDeviceType] = await db.select().from(deviceType).limit(1)
  return { configEndpoint, configDeviceType }
}

describe("DELETE /configs/{id}", () => {
  beforeEach(async () => {
    fakeAmneziawg2Client = createFakeAmneziawg2Client()
    getProtocolClientSpy = vi
      .spyOn(RemoteServer.prototype, "getProtocolClient")
      .mockReturnValue(fakeAmneziawg2Client.client)
    await bootstrapDeviceTypes()
  })

  it("removes the config row, removes the peer from the node and returns the id matching the contract output", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const clientIdentifier = createTestIp()
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
      clientIdentifier,
      data: {
        protocolCode: ProtocolCodeSchema.enum.amneziawg2,
        clientIp: clientIdentifier,
        options: { ...Amneziawg2ObfuscationDefaults },
      },
    })

    const deletedConfig = await callDeleteUserConfig(headers, insertedConfig.id)

    const parsed = DeleteUserConfigOutputSchema.parse(deletedConfig)
    expect(parsed.id).toBe(insertedConfig.id)
    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg2Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
      insertedConfig.data,
    ])
  })

  it("frees the user's limit slot immediately after a successful delete", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg2.family,
      maxCount: 1,
    })
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    await callDeleteUserConfig(headers, insertedConfig.id)

    const createUserConfigInput: UpsertConfig = {
      name: "Created Config",
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    }
    const createdConfig = await call(configRouter.createUserConfig, createUserConfigInput, {
      context: { headers },
    })
    expect(ConfigSchema.parse(createdConfig).name).toBe("Created Config")
  })

  it("deletes a pending config just inside the reservation window, removing its row and its peer from the node", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const pendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PENDING_CONFIG_RESERVATION_MINUTES - 1) * 60 * 1000),
    })

    const deletedConfig = await callDeleteUserConfig(headers, pendingConfig.id)

    const parsed = DeleteUserConfigOutputSchema.parse(deletedConfig)
    expect(parsed.id).toBe(pendingConfig.id)
    const configRows = await db.select().from(config).where(eq(config.id, pendingConfig.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg2Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
      pendingConfig.data,
    ])
  })

  it("deletes a pending config older than the reservation window, removing its row and its peer from the node", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const stalePendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
      createdAt: new Date(Date.now() - (PENDING_CONFIG_RESERVATION_MINUTES + 1) * 60 * 1000),
    })

    const deletedConfig = await callDeleteUserConfig(headers, stalePendingConfig.id)

    const parsed = DeleteUserConfigOutputSchema.parse(deletedConfig)
    expect(parsed.id).toBe(stalePendingConfig.id)
    const configRows = await db.select().from(config).where(eq(config.id, stalePendingConfig.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg2Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
      stalePendingConfig.data,
    ])
  })

  it("deletes a config stuck in deleting status, removing its row and its peer from the node", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const deletingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "deleting",
    })

    const deletedConfig = await callDeleteUserConfig(headers, deletingConfig.id)

    const parsed = DeleteUserConfigOutputSchema.parse(deletedConfig)
    expect(parsed.id).toBe(deletingConfig.id)
    const configRows = await db.select().from(config).where(eq(config.id, deletingConfig.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg2Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
      deletingConfig.data,
    ])
  })

  it("deletes a config on an endpoint whose protocol is disabled", async () => {
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

    const deletedConfig = await callDeleteUserConfig(headers, disabledProtocolConfig.id)

    const parsed = DeleteUserConfigOutputSchema.parse(deletedConfig)
    expect(parsed.id).toBe(disabledProtocolConfig.id)
    const configRows = await db
      .select()
      .from(config)
      .where(eq(config.id, disabledProtocolConfig.id))
    expect(configRows).toHaveLength(0)
  })

  it("leaves the user's other config and its node peer untouched on a successful delete", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const deletedConfigRow = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })
    const siblingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    await callDeleteUserConfig(headers, deletedConfigRow.id)

    const configRows = await db.select().from(config).where(eq(config.id, siblingConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("active")
    expect(configRows[0].data).toEqual(siblingConfig.data)
    expect(fakeAmneziawg2Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
      deletedConfigRow.data,
    ])
  })

  it("leaves another user's config untouched on a successful delete", async () => {
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
    const otherUserConfig = await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    await callDeleteUserConfig(headers, requestUserConfig.id)

    const configRows = await db.select().from(config).where(eq(config.id, otherUserConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("active")
    expect(configRows[0].data).toEqual(otherUserConfig.data)
    expect(fakeAmneziawg2Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
      requestUserConfig.data,
    ])
  })

  it("rejects an unknown id with NOT_FOUND without touching any config row or calling the node", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    await expectOrpcError(callDeleteUserConfig(headers, randomUUID()), "NOT_FOUND")

    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("active")
    expect(fakeAmneziawg2Client.deleteAccesses).not.toHaveBeenCalled()
  })

  it("rejects another user's config with NOT_FOUND, leaves its row unchanged and does not call the node", async () => {
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

    await expectOrpcError(callDeleteUserConfig(headers, otherUserConfig.id), "NOT_FOUND")

    const configRows = await db.select().from(config).where(eq(config.id, otherUserConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("active")
    expect(configRows[0].data).toEqual(otherUserConfig.data)
    expect(fakeAmneziawg2Client.deleteAccesses).not.toHaveBeenCalled()
  })

  it("returns the deleted id, keeps the config row with status deleting and hides it from the user's config list when the node-side delete fails", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })
    fakeAmneziawg2Client.deleteAccesses.mockRejectedValueOnce(new Error("Node-side failure"))

    const deletedConfig = await callDeleteUserConfig(headers, insertedConfig.id)

    const parsed = DeleteUserConfigOutputSchema.parse(deletedConfig)
    expect(parsed.id).toBe(insertedConfig.id)
    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("deleting")
    expect(fakeAmneziawg2Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
      insertedConfig.data,
    ])
    const configs = await call(configRouter.getUserConfigs, undefined, { context: { headers } })
    expect(configs).toHaveLength(0)
  })

  it("returns the deleted id and keeps the config row with status deleting when the server has no usable data", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      server: { data: null },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const insertedConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    const deletedConfig = await callDeleteUserConfig(headers, insertedConfig.id)

    const parsed = DeleteUserConfigOutputSchema.parse(deletedConfig)
    expect(parsed.id).toBe(insertedConfig.id)
    const configRows = await db.select().from(config).where(eq(config.id, insertedConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("deleting")
    expect(fakeAmneziawg2Client.deleteAccesses).not.toHaveBeenCalled()
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

    const deletedConfig = await callDeleteUserConfig(headers, adminConfig.id)

    const parsed = DeleteUserConfigOutputSchema.parse(deletedConfig)
    expect(parsed.id).toBe(adminConfig.id)
  })

  describe("amneziawg2", () => {
    it("removes the peer from the node by the config's client identifier for the target endpoint", async () => {
      const targetEndpointHost = "target-endpoint.example.test"
      const targetEndpointPort = 51999
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
        endpoint: {
          data: {
            actualState: {
              ...FakeAmneziawg2EndpointActualState,
              host: targetEndpointHost,
              port: targetEndpointPort,
            },
          },
        },
      })
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      const clientIdentifier = createTestIp()
      const insertedConfig = await insertTestConfig({
        userId: requestUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
        status: "active",
        clientIdentifier,
        data: {
          protocolCode: ProtocolCodeSchema.enum.amneziawg2,
          clientIp: clientIdentifier,
          publicKey: "test-public-key",
          presharedKey: "test-preshared-key",
          options: { ...Amneziawg2ObfuscationDefaults },
        },
      })

      await callDeleteUserConfig(headers, insertedConfig.id)

      expect(getProtocolClientSpy).toHaveBeenCalledWith(ProtocolCodeSchema.enum.amneziawg2)
      expect(fakeAmneziawg2Client.deleteAccesses).toHaveBeenCalledWith(
        expect.objectContaining({ host: targetEndpointHost, port: targetEndpointPort }),
        [insertedConfig.data],
      )
      const [, deletedAccessesData] = fakeAmneziawg2Client.deleteAccesses.mock.calls[0]
      expect(deletedAccessesData).toEqual([
        expect.objectContaining({ clientIp: insertedConfig.clientIdentifier }),
      ])
    })
  })

  describe("technical", () => {
    it("keeps another user's config untouched when the deletable-configs query returns a foreign row", async () => {
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
      const otherUserConfig = await insertTestConfig({
        userId: otherUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
        status: "active",
      })
      const originalFindDeletableUserConfigs = vi
        .mocked(findDeletableUserConfigs)
        .getMockImplementation()!
      vi.mocked(findDeletableUserConfigs).mockImplementationOnce(
        async (...findDeletableUserConfigsArguments) => {
          const deletableConfigs = await originalFindDeletableUserConfigs(
            ...findDeletableUserConfigsArguments,
          )
          return deletableConfigs.map((deletableConfig) => ({
            ...deletableConfig,
            id: otherUserConfig.id,
          }))
        },
      )

      await callDeleteUserConfig(headers, requestUserConfig.id)

      const configRows = await db.select().from(config).where(eq(config.id, otherUserConfig.id))
      expect(configRows).toHaveLength(1)
      expect(configRows[0].status).toBe("active")
      expect(configRows[0].data).toEqual(otherUserConfig.data)
    })

    it("responds with HTTP 500 when the config lookup query throws", async () => {
      vi.mocked(findDeletableUserConfigs).mockRejectedValueOnce(new Error("Query failure"))
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const response = await app.request(`/api/configs/${randomUUID()}`, {
        method: "DELETE",
        headers,
      })

      expect(response.status).toBe(500)
    })
  })
})
