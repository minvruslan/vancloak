import { randomUUID } from "node:crypto"
import { inflateSync } from "node:zlib"
import { call } from "@orpc/server"
import { ConfigSchema, type UpsertConfig } from "@vancloak/api-contract"
import {
  Amneziawg3BrowserFingerprintSchema,
  Amneziawg3IntensitySchema,
  Amneziawg3ObfuscationDefaults,
  Amneziawg3ProtocolProfileSchema,
  ProtocolCodeSchema,
  ProtocolRegistry,
  convertIpToNumber,
  convertNumberToIp,
  parseIpSubnet,
  type EndpointData,
  type ServerData,
} from "@vancloak/infrastructure/shared"
import { RemoteServer } from "@vancloak/infrastructure"
import { buildAmneziawg3ConfigName } from "@vancloak/infrastructure/shared"
import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest"
import { z } from "zod"
import app from "@/api/app.js"
import { PendingConfigReservationMinutes } from "@/api/modules/config-limit/queries/constants/PendingConfigReservationMinutes.js"
import { configRouter } from "@/api/modules/config/index.js"
import { findEndpointProtocolClientData } from "@/api/modules/config/queries/findEndpointProtocolClientData.js"
import { insertUserConfig } from "@/api/modules/config/queries/insertUserConfig.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { config, deviceType, endpoint, protocol, server } from "@/core/database/schemas/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  createFakeAmneziawg3Client,
  FakeAmneziawg3EndpointActualState,
  FakeAmneziawg3CreateAccessResult,
  FAKE_SERVER_SSH_HOST_KEY,
  insertTestConfig,
  insertTestConfigLimit,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
  waitForDatabaseLockWaiter,
} from "@tests/helpers/index.js"

vi.mock(
  "@/api/modules/config/queries/findEndpointProtocolClientData.js",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/api/modules/config/queries/findEndpointProtocolClientData.js")
      >()
    return { findEndpointProtocolClientData: vi.fn(original.findEndpointProtocolClientData) }
  },
)

vi.mock("@/api/modules/config/queries/insertUserConfig.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/config/queries/insertUserConfig.js")>()
  return { insertUserConfig: vi.fn(original.insertUserConfig) }
})

const CreateUserConfigOutputSchema = ConfigSchema.extend({
  clientConfiguration: z.string(),
  clientConfigurationLink: z.string(),
})

const AmneziaConfigImportSchema = z.object({
  containers: z.tuple([
    z.object({
      container: z.literal("amnezia-awg"),
      awg: z.object({
        last_config: z.string(),
        isThirdPartyConfig: z.literal(true),
        port: z.string(),
        transport_proto: z.literal("udp"),
      }),
    }),
  ]),
  defaultContainer: z.literal("amnezia-awg"),
  description: z.string(),
  dns1: z.string().optional(),
  dns2: z.string().optional(),
  hostName: z.string(),
})

const AmneziaLastConfigSchema = z.object({
  config: z.string(),
  hostName: z.string(),
  port: z.number(),
  client_priv_key: z.string(),
  client_ip: z.string(),
  psk_key: z.string(),
  server_pub_key: z.string(),
  mtu: z.string(),
  persistent_keep_alive: z.string(),
  allowed_ips: z.array(z.string()),
  Jc: z.string(),
  Jmin: z.string(),
  Jmax: z.string(),
  S1: z.string(),
  S2: z.string(),
  S3: z.string(),
  S4: z.string(),
  H1: z.string(),
  H2: z.string(),
  H3: z.string(),
  H4: z.string(),
  I1: z.string(),
  I2: z.string().optional(),
  I3: z.string().optional(),
  I4: z.string().optional(),
  I5: z.string().optional(),
})

const FIRST_CLIENT_ADDRESS_OFFSET = 2
const ADDRESSES_PER_OCTET = 256

const fakeConfigData = FakeAmneziawg3CreateAccessResult.configData
const fakeClientConfiguration = FakeAmneziawg3CreateAccessResult.clientConfiguration
const fakeClientConfigurationLink = FakeAmneziawg3CreateAccessResult.clientConfigurationLink

const validServerData: ServerData = {
  facts: { sshHostKeys: [FAKE_SERVER_SSH_HOST_KEY] },
  actualState: {
    ssh: { type: "privateKey", username: "vancloak", port: 22 },
    baseDirectory: "/opt/vancloak",
    appliedAt: "2026-01-01T00:00:00.000Z",
  },
}

const validEndpointData: EndpointData = {
  actualState: FakeAmneziawg3EndpointActualState,
}

const serverDataWithoutSshHostKeys: ServerData = {
  ...validServerData,
  facts: { sshHostKeys: [] },
}

const endpointActualStateWithoutHost = { ...FakeAmneziawg3EndpointActualState, host: undefined }

const endpointActualStateWithoutDns = { ...FakeAmneziawg3EndpointActualState, dns: undefined }

const unparsableEndpointData = "not-endpoint-data" as unknown as EndpointData

const unsupportedProtocolClientData = {
  serverIp: "192.0.2.1",
  protocolCode: "bogus",
  serverData: validServerData,
  endpointData: validEndpointData,
}

let fakeAmneziawg3Client: ReturnType<typeof createFakeAmneziawg3Client>
let getProtocolClientSpy: MockInstance<RemoteServer["getProtocolClient"]>

function callCreateUserConfig(input: unknown, headers: Headers) {
  return call(configRouter.createUserConfig, input as UpsertConfig, { context: { headers } })
}

function requestCreateUserConfig(input: Record<string, unknown>, headers: Headers) {
  headers.set("content-type", "application/json")
  return app.request("/api/configs", { method: "POST", headers, body: JSON.stringify(input) })
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
  return { configProtocol, configServer, configEndpoint, configDeviceType }
}

describe("POST /configs", () => {
  beforeEach(async () => {
    fakeAmneziawg3Client = createFakeAmneziawg3Client()
    getProtocolClientSpy = vi
      .spyOn(RemoteServer.prototype, "getProtocolClient")
      .mockReturnValue(fakeAmneziawg3Client.client)
    await bootstrapDeviceTypes()
  })

  it("creates an active config in the database, adds the peer to the node and returns it with the client configuration matching the contract schema", async () => {
    const { configProtocol, configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.name).toBe("Created Config")
    expect(parsed.status).toBe("active")
    expect(parsed.deviceType.id).toBe(configDeviceType.id)
    expect(parsed.endpoint.id).toBe(configEndpoint.id)
    expect(parsed.data.protocolCode).toBe(configProtocol.code)
    expect(parsed.endpoint.protocol.code).toBe(configProtocol.code)
    expect(parsed.data).toEqual(fakeConfigData)
    expect(parsed.clientConfiguration).toBe(fakeClientConfiguration)
    expect(parsed.clientConfigurationLink).toBe(fakeClientConfigurationLink)
    const configRows = await db.select().from(config).where(eq(config.id, createdConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("active")
    expect(configRows[0].userId).toBe(requestUser.id)
    expect(configRows[0].clientIdentifier).toBe(fakeConfigData.clientIp)
    expect(configRows[0].data).toEqual(fakeConfigData)
    expect(fakeAmneziawg3Client.createAccess).toHaveBeenCalledTimes(1)
  })

  it("responds with HTTP 201 on success", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    const response = await requestCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    expect(response.status).toBe(201)
  })

  it("creates a config on an endpoint whose protocol is disabled", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      protocol: { isEnabled: false },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.endpoint.id).toBe(configEndpoint.id)
    expect(parsed.status).toBe("active")
  })

  it("leaves the user's other active config untouched on a successful creation", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherActiveConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const configRows = await db.select().from(config).where(eq(config.id, otherActiveConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].name).toBe(otherActiveConfig.name)
    expect(configRows[0].status).toBe("active")
    expect(configRows[0].data).toEqual(otherActiveConfig.data)
    expect(configRows[0].updatedAt.getTime()).toBe(otherActiveConfig.updatedAt.getTime())
  })

  it("leaves another user's pending config untouched on a successful creation", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    const otherUserPendingConfig = await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
    })

    await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const configRows = await db
      .select()
      .from(config)
      .where(eq(config.id, otherUserPendingConfig.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("pending")
    expect(configRows[0].data).toEqual(otherUserPendingConfig.data)
    expect(configRows[0].updatedAt.getTime()).toBe(otherUserPendingConfig.updatedAt.getTime())
  })

  it("rejects an unknown endpointId with ENDPOINT_INVALID without writing a config row or calling the node", async () => {
    const { configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(
      callCreateUserConfig(
        { name: "Created Config", endpointId: randomUUID(), deviceTypeId: configDeviceType.id },
        headers,
      ),
      "ENDPOINT_INVALID",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("rejects an endpoint whose server is not active with ENDPOINT_INVALID without writing a config row or calling the node", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      server: { status: "provisioning" },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "ENDPOINT_INVALID",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("rejects an unknown deviceTypeId with DEVICE_TYPE_INVALID without writing a config row or calling the node", async () => {
    const { configEndpoint } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(
      callCreateUserConfig(
        { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: randomUUID() },
        headers,
      ),
      "DEVICE_TYPE_INVALID",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("rejects a disabled device type with DEVICE_TYPE_INVALID without writing a config row or calling the node", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await db
      .update(deviceType)
      .set({ isEnabled: false })
      .where(eq(deviceType.id, configDeviceType.id))

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "DEVICE_TYPE_INVALID",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("rejects the creation with NO_AVAILABLE_IP and leaves no config row when the endpoint has no free client IP", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    fakeAmneziawg3Client.allocateClientIdentifier.mockReturnValueOnce(null)

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "NO_AVAILABLE_IP",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("rejects the creation with LIMIT_REACHED without writing a config row or calling the node when slot-reserving configs equal maxCount", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 2,
    })
    const activeConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })
    const pendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
    })

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "LIMIT_REACHED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows.map((row) => row.id).sort()).toEqual(
      [activeConfig.id, pendingConfig.id].sort(),
    )
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("rejects the creation with LIMIT_REACHED when slot-reserving configs already exceed maxCount", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 1,
    })
    const firstActiveConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })
    const secondActiveConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "LIMIT_REACHED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows.map((row) => row.id).sort()).toEqual(
      [firstActiveConfig.id, secondActiveConfig.id].sort(),
    )
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("creates a config when slot-reserving configs are one below maxCount", async () => {
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
      status: "active",
    })

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.name).toBe("Created Config")
    expect(parsed.status).toBe("active")
  })

  it("creates a config when the user has no config limit row for the protocol family", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
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
      status: "active",
    })

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.name).toBe("Created Config")
    expect(parsed.status).toBe("active")
  })

  it("counts a pending config just inside the reservation window toward the limit", async () => {
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
      status: "pending",
      createdAt: new Date(Date.now() - (PendingConfigReservationMinutes - 1) * 60 * 1000),
    })

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "LIMIT_REACHED",
    )
  })

  it("does not count a pending config older than the reservation window toward the limit", async () => {
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
      status: "pending",
      createdAt: new Date(Date.now() - (PendingConfigReservationMinutes + 1) * 60 * 1000),
    })

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.name).toBe("Created Config")
  })

  it("does not count a deleting config toward the limit", async () => {
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
      status: "deleting",
    })

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.name).toBe("Created Config")
  })

  it("does not count another user's configs toward the limit", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 1,
    })
    await insertTestConfig({
      userId: otherUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "active",
    })

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.name).toBe("Created Config")
  })

  it("ignores another user's config limit row", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: otherUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 0,
    })

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.name).toBe("Created Config")
  })

  it("rejects one of two parallel creations on different servers when maxCount is one", async () => {
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
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 1,
    })
    let releaseInsert!: () => void
    let markInsertReached!: () => void
    const insertReleased = new Promise<void>((resolve) => {
      releaseInsert = resolve
    })
    const insertReached = new Promise<void>((resolve) => {
      markInsertReached = resolve
    })
    const originalInsertUserConfig = vi.mocked(insertUserConfig).getMockImplementation()!
    vi.mocked(insertUserConfig).mockImplementationOnce(async (executor, values) => {
      markInsertReached()
      await insertReleased
      return originalInsertUserConfig(executor, values)
    })

    const firstCreateUserConfigResult = callCreateUserConfig(
      { name: "First Config", endpointId: firstEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )
    await insertReached
    const secondCreateUserConfigResult = callCreateUserConfig(
      { name: "Second Config", endpointId: secondEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )
    await waitForDatabaseLockWaiter(secondCreateUserConfigResult)
    releaseInsert()

    const firstCreatedConfig = await firstCreateUserConfigResult
    await expectOrpcError(secondCreateUserConfigResult, "LIMIT_REACHED")
    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].id).toBe(firstCreatedConfig.id)
  })

  it("waits for the server advisory lock and rejects with LIMIT_REACHED after a concurrent reservation commits", async () => {
    const { configServer, configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 1,
    })
    let releaseReservation!: () => void
    let markReservationHeld!: () => void
    const reservationReleased = new Promise<void>((resolve) => {
      releaseReservation = resolve
    })
    const reservationHeld = new Promise<void>((resolve) => {
      markReservationHeld = resolve
    })
    const reservationTransaction = db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${configServer.id}))`)
      await insertTestConfig(
        {
          userId: requestUser.id,
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
          status: "active",
        },
        tx,
      )
      markReservationHeld()
      await reservationReleased
    })
    await reservationHeld

    const createUserConfigResult = callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )
    await waitForDatabaseLockWaiter(createUserConfigResult)
    releaseReservation()
    await reservationTransaction

    await expectOrpcError(createUserConfigResult, "LIMIT_REACHED")
    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(1)
  })

  it("creates both configs with distinct client identifiers when two parallel creations target the same server", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    let releaseInsert!: () => void
    let markInsertReached!: () => void
    const insertReleased = new Promise<void>((resolve) => {
      releaseInsert = resolve
    })
    const insertReached = new Promise<void>((resolve) => {
      markInsertReached = resolve
    })
    const originalInsertUserConfig = vi.mocked(insertUserConfig).getMockImplementation()!
    vi.mocked(insertUserConfig).mockImplementationOnce(async (executor, values) => {
      markInsertReached()
      await insertReleased
      return originalInsertUserConfig(executor, values)
    })

    const firstCreateUserConfigResult = callCreateUserConfig(
      { name: "First Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )
    await insertReached
    const secondCreateUserConfigResult = callCreateUserConfig(
      { name: "Second Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )
    await waitForDatabaseLockWaiter(secondCreateUserConfigResult)
    releaseInsert()
    const firstCreatedConfig = await firstCreateUserConfigResult
    const secondCreatedConfig = await secondCreateUserConfigResult

    CreateUserConfigOutputSchema.parse(firstCreatedConfig)
    CreateUserConfigOutputSchema.parse(secondCreatedConfig)
    const configRows = await db
      .select()
      .from(config)
      .where(eq(config.endpointId, configEndpoint.id))
    expect(configRows).toHaveLength(2)
    expect(configRows.every((row) => row.status === "active")).toBe(true)
    const clientIdentifiers = configRows.map((row) => row.clientIdentifier)
    expect(new Set(clientIdentifiers).size).toBe(2)
    expect(configRows.every((row) => row.data.clientIp === row.clientIdentifier)).toBe(true)
    expect(fakeAmneziawg3Client.createAccess).toHaveBeenCalledTimes(2)
    expect(
      fakeAmneziawg3Client.createAccess.mock.calls
        .map(([, clientIdentifier]) => clientIdentifier)
        .sort(),
    ).toEqual([...clientIdentifiers].sort())
  })

  it("returns FAILED, removes the config row, removes the peer from the node and leaves the user's other pending config untouched when the node-side creation fails", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const otherPendingConfig = await insertTestConfig({
      userId: requestUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
      status: "pending",
    })
    fakeAmneziawg3Client.createAccess.mockRejectedValueOnce(new Error("Node-side failure"))

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "FAILED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].id).toBe(otherPendingConfig.id)
    expect(configRows[0].status).toBe("pending")
    expect(configRows[0].data).toEqual(otherPendingConfig.data)
    expect(fakeAmneziawg3Client.deleteAccessByClientIdentifier).toHaveBeenCalledWith(
      expect.anything(),
      fakeConfigData.clientIp,
    )
  })

  it("keeps the config row with status pending when both the node-side creation and the rollback delete fail", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    fakeAmneziawg3Client.createAccess.mockRejectedValueOnce(new Error("Node-side failure"))
    fakeAmneziawg3Client.deleteAccessByClientIdentifier.mockRejectedValueOnce(
      new Error("Rollback failure"),
    )

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "FAILED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("pending")
  })

  it("returns FAILED, keeps the config row with status deleting and rolls the peer back off the node when the config is cancelled during node-side creation", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    fakeAmneziawg3Client.createAccess.mockImplementationOnce(async () => {
      await db.update(config).set({ status: "deleting" }).where(eq(config.userId, requestUser.id))
      return {
        configData: fakeConfigData,
        clientConfiguration: fakeClientConfiguration,
        clientConfigurationLink: fakeClientConfigurationLink,
      }
    })

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "FAILED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("deleting")
    expect(fakeAmneziawg3Client.deleteAccessByClientIdentifier).toHaveBeenCalledWith(
      expect.anything(),
      fakeConfigData.clientIp,
    )
  })

  it("returns FAILED and leaves no config row when the endpoint's server has no data", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      server: { data: null },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "FAILED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("returns FAILED when the server facts contain no ssh host keys", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      server: { data: serverDataWithoutSshHostKeys },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "FAILED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("returns FAILED when the endpoint actual state has no host", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      endpoint: { data: { actualState: endpointActualStateWithoutHost } },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "FAILED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("returns FAILED when the endpoint data does not parse as valid endpoint data", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      endpoint: { data: unparsableEndpointData },
    })
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(
      callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      ),
      "FAILED",
    )

    const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
    expect(configRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
  })

  it("responds with HTTP 502 when the node-side creation fails", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    fakeAmneziawg3Client.createAccess.mockRejectedValueOnce(new Error("Node-side failure"))

    const response = await requestCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    expect(response.status).toBe(502)
  })

  it("responds with HTTP 503 when the endpoint has no free client IP", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    fakeAmneziawg3Client.allocateClientIdentifier.mockReturnValueOnce(null)

    const response = await requestCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    expect(response.status).toBe(503)
  })

  it("responds with HTTP 409 when the config limit is reached", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    await insertTestConfigLimit({
      userId: requestUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 0,
    })

    const response = await requestCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    expect(response.status).toBe(409)
  })

  it("responds with HTTP 400 when the endpointId is unknown", async () => {
    const { configDeviceType } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    const response = await requestCreateUserConfig(
      { name: "Created Config", endpointId: randomUUID(), deviceTypeId: configDeviceType.id },
      headers,
    )

    expect(response.status).toBe(400)
  })

  it("responds with HTTP 400 when the deviceTypeId is unknown", async () => {
    const { configEndpoint } = await insertConfigPrerequisites()
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    const response = await requestCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: randomUUID() },
      headers,
    )

    expect(response.status).toBe(400)
  })

  it("allows an admin user as well", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const adminUser = await insertTestUser({ role: "admin" })
    const headers = await insertTestSession(adminUser)

    const createdConfig = await callCreateUserConfig(
      { name: "Created Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
      headers,
    )

    const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
    expect(parsed.name).toBe("Created Config")
  })

  describe("amneziawg3", () => {
    it.todo("reserves the client identifiers of configs on the server's other endpoints")

    it("adds the peer to the node for the target endpoint", async () => {
      const targetEndpointHost = "target-endpoint.example.test"
      const targetEndpointPort = 51999
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
        endpoint: {
          data: {
            actualState: {
              ...FakeAmneziawg3EndpointActualState,
              host: targetEndpointHost,
              port: targetEndpointPort,
            },
          },
        },
      })
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      expect(getProtocolClientSpy).toHaveBeenCalledWith(ProtocolCodeSchema.enum.amneziawg3)
      expect(fakeAmneziawg3Client.createAccess).toHaveBeenCalledTimes(1)
      const [endpointActualState, clientIdentifier] =
        fakeAmneziawg3Client.createAccess.mock.calls[0]
      expect(endpointActualState).toMatchObject({
        host: targetEndpointHost,
        port: targetEndpointPort,
      })
      expect(clientIdentifier).toBe(fakeConfigData.clientIp)
    })

    it("returns exactly the amneziawg3 config data fields and the client configuration and import link at the top level", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      expect(Object.keys(createdConfig.data).sort()).toEqual([
        "clientIp",
        "clientObfuscation",
        "dns",
        "host",
        "mtu",
        "options",
        "port",
        "presharedKey",
        "protocolCode",
        "publicKey",
        "serverObfuscation",
        "serverPublicKey",
      ])
      expect(createdConfig.clientConfiguration).toBe(fakeClientConfiguration)
      expect(createdConfig.clientConfigurationLink).toBe(fakeClientConfigurationLink)
    })

    it("stores the data column encrypted at rest without the plaintext public or preshared key", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const rawConfigRows = await db.execute<{ data: string }>(
        sql`select data::text as data from config where id = ${createdConfig.id}::uuid`,
      )
      expect(rawConfigRows).toHaveLength(1)
      expect(rawConfigRows[0].data.startsWith("v1:")).toBe(true)
      expect(rawConfigRows[0].data).not.toContain(fakeConfigData.publicKey)
      expect(rawConfigRows[0].data).not.toContain(fakeConfigData.presharedKey)
    })

    it("persists the provided obfuscation options into the config data and returns them", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      const requestedObfuscationOptions = {
        protocolProfile: Amneziawg3ProtocolProfileSchema.enum.quic_initial,
        browserFingerprint: Amneziawg3BrowserFingerprintSchema.enum.firefox,
        junkPacketCount: Amneziawg3IntensitySchema.enum.high,
        junkPacketSize: Amneziawg3IntensitySchema.enum.low,
        noisePackets: Amneziawg3IntensitySchema.enum.medium,
      }

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
          protocolOptions: {
            protocolCode: ProtocolCodeSchema.enum.amneziawg3,
            ...requestedObfuscationOptions,
          },
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(parsed.data.options).toEqual(requestedObfuscationOptions)
      const configRows = await db.select().from(config).where(eq(config.id, createdConfig.id))
      expect(configRows[0].data.options).toEqual(requestedObfuscationOptions)
    })

    it("applies the default obfuscation options when protocolOptions is omitted", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(parsed.data.options).toEqual(Amneziawg3ObfuscationDefaults)
      const configRows = await db.select().from(config).where(eq(config.id, createdConfig.id))
      expect(configRows[0].data.options).toEqual(Amneziawg3ObfuscationDefaults)
    })

    it("fills unspecified obfuscation fields with defaults when protocolOptions carries only the protocolCode", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
          protocolOptions: { protocolCode: ProtocolCodeSchema.enum.amneziawg3 },
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(parsed.data.options).toEqual(Amneziawg3ObfuscationDefaults)
      const configRows = await db.select().from(config).where(eq(config.id, createdConfig.id))
      expect(configRows[0].data.options).toEqual(Amneziawg3ObfuscationDefaults)
    })

    it("persists an explicit null browserFingerprint instead of the chrome default", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
          protocolOptions: {
            protocolCode: ProtocolCodeSchema.enum.amneziawg3,
            browserFingerprint: null,
          },
        },
        headers,
      )

      expect(Amneziawg3ObfuscationDefaults.browserFingerprint).toBe(
        Amneziawg3BrowserFingerprintSchema.enum.chrome,
      )
      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(parsed.data.options).toEqual({
        ...Amneziawg3ObfuscationDefaults,
        browserFingerprint: null,
      })
      const configRows = await db.select().from(config).where(eq(config.id, createdConfig.id))
      expect(configRows[0].data.options.browserFingerprint).toBeNull()
    })

    it("renders the requested obfuscation options into the client configuration", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      const requestedProtocolOptions = {
        protocolCode: ProtocolCodeSchema.enum.amneziawg3,
        protocolProfile: Amneziawg3ProtocolProfileSchema.enum.quic_initial,
        browserFingerprint: Amneziawg3BrowserFingerprintSchema.enum.safari,
        junkPacketCount: Amneziawg3IntensitySchema.enum.low,
        junkPacketSize: Amneziawg3IntensitySchema.enum.high,
        noisePackets: Amneziawg3IntensitySchema.enum.low,
      }
      fakeAmneziawg3Client.createAccess.mockImplementationOnce(
        async (_endpointActualState, clientIdentifier, protocolOptions) => ({
          configData: { ...fakeConfigData, clientIp: clientIdentifier },
          clientConfiguration: JSON.stringify(protocolOptions),
          clientConfigurationLink: fakeClientConfigurationLink,
        }),
      )

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
          protocolOptions: requestedProtocolOptions,
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(JSON.parse(parsed.clientConfiguration)).toEqual(requestedProtocolOptions)
    })

    it("renders the client configuration from the endpoint's applied actual state and not from the live server columns", async () => {
      const appliedHost = "vpn.example.com"
      const { configServer, configEndpoint, configDeviceType } = await insertConfigPrerequisites({
        server: { ip: "203.0.113.9", domainName: "live.example.com" },
        endpoint: {
          data: { actualState: { ...FakeAmneziawg3EndpointActualState, host: appliedHost } },
        },
      })
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      fakeAmneziawg3Client.createAccess.mockImplementation(
        async (endpointActualState, clientIdentifier) => ({
          configData: { ...fakeConfigData, clientIp: clientIdentifier },
          clientConfiguration: `Endpoint = ${endpointActualState.host}:${endpointActualState.port}`,
          clientConfigurationLink: fakeClientConfigurationLink,
        }),
      )

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )
      await db
        .update(server)
        .set({ domainName: "changed.example.com" })
        .where(eq(server.id, configServer.id))
      const recreatedConfig = await callCreateUserConfig(
        {
          name: "Recreated Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const expectedEndpointLine = `Endpoint = ${appliedHost}:${configEndpoint.port}`
      expect(CreateUserConfigOutputSchema.parse(createdConfig).clientConfiguration).toBe(
        expectedEndpointLine,
      )
      expect(CreateUserConfigOutputSchema.parse(recreatedConfig).clientConfiguration).toBe(
        expectedEndpointLine,
      )
    })

    it("builds the Amnezia vpn:// import link around the generated client configuration", async () => {
      const { configServer, configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      fakeAmneziawg3Client.createAccess.mockRestore()
      vi.spyOn(fakeAmneziawg3Client.client, "applyAccesses").mockResolvedValue(undefined)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(parsed.clientConfigurationLink).toMatch(/^vpn:\/\//)
      const compressed = Buffer.from(
        parsed.clientConfigurationLink.slice("vpn://".length),
        "base64url",
      )
      const inflated = inflateSync(compressed.subarray(4))
      expect(compressed.readUInt32BE(0)).toBe(inflated.length)

      const configImport = AmneziaConfigImportSchema.parse(JSON.parse(inflated.toString()))
      expect(configImport).toMatchObject({
        description: buildAmneziawg3ConfigName(configServer.name),
        hostName: FakeAmneziawg3EndpointActualState.host,
        dns1: FakeAmneziawg3EndpointActualState.dns,
      })
      expect(configImport.dns2).toBeUndefined()
      expect(configImport.containers[0].awg.port).toBe(
        String(FakeAmneziawg3EndpointActualState.port),
      )

      const lastConfig = AmneziaLastConfigSchema.parse(
        JSON.parse(configImport.containers[0].awg.last_config),
      )
      const endpointObfuscation = FakeAmneziawg3EndpointActualState.obfuscation
      expect(lastConfig).toMatchObject({
        config: parsed.clientConfiguration,
        hostName: FakeAmneziawg3EndpointActualState.host,
        port: FakeAmneziawg3EndpointActualState.port,
        client_ip: `${parsed.data.clientIp}/32`,
        psk_key: parsed.data.presharedKey,
        server_pub_key: FakeAmneziawg3EndpointActualState.serverPublicKey,
        allowed_ips: ["0.0.0.0/0", "::/0"],
        S1: String(endpointObfuscation.s1),
        S2: String(endpointObfuscation.s2),
        S3: String(endpointObfuscation.s3),
        S4: String(endpointObfuscation.s4),
        H1: String(endpointObfuscation.h1),
        H2: String(endpointObfuscation.h2),
        H3: String(endpointObfuscation.h3),
        H4: String(endpointObfuscation.h4),
      })
      expect([lastConfig.I2, lastConfig.I3, lastConfig.I4, lastConfig.I5]).toEqual([
        undefined,
        undefined,
        undefined,
        undefined,
      ])

      const configurationLines = parsed.clientConfiguration.split("\n")
      expect(configurationLines).toContain(`PrivateKey = ${lastConfig.client_priv_key}`)
      expect(configurationLines).toContain(`Address = ${lastConfig.client_ip}`)
      expect(configurationLines).toContain(`MTU = ${lastConfig.mtu}`)
      expect(configurationLines).toContain(
        `PersistentKeepalive = ${lastConfig.persistent_keep_alive}`,
      )
      expect(configurationLines).toContain(`AllowedIPs = ${lastConfig.allowed_ips.join(", ")}`)
      expect(configurationLines).toContain(`Jc = ${lastConfig.Jc}`)
      expect(configurationLines).toContain(`Jmin = ${lastConfig.Jmin}`)
      expect(configurationLines).toContain(`Jmax = ${lastConfig.Jmax}`)
      expect(configurationLines).toContain(`I1 = ${lastConfig.I1}`)
    })

    it("names the import link after the slugified server name", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
        server: { name: "Amsterdam Node" },
      })
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      fakeAmneziawg3Client.createAccess.mockRestore()
      vi.spyOn(fakeAmneziawg3Client.client, "applyAccesses").mockResolvedValue(undefined)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      const compressed = Buffer.from(
        parsed.clientConfigurationLink.slice("vpn://".length),
        "base64url",
      )
      const configImport = AmneziaConfigImportSchema.parse(
        JSON.parse(inflateSync(compressed.subarray(4)).toString()),
      )
      expect(configImport.description).toBe("amsterdam-node")
    })
    it("reuses the client identifier of a deleted config", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      const firstConfig = await callCreateUserConfig(
        { name: "First Config", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
        headers,
      )
      await call(configRouter.deleteUserConfig, { id: firstConfig.id }, { context: { headers } })

      const recreatedConfig = await callCreateUserConfig(
        {
          name: "Recreated Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(recreatedConfig)
      expect(parsed.data.clientIp).toBe(fakeConfigData.clientIp)
    })

    it("does not reserve client identifiers of configs on another server", async () => {
      const { configProtocol, configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const otherServer = await insertTestServer()
      const otherEndpoint = await insertTestEndpoint({
        serverId: otherServer.id,
        protocolId: configProtocol.id,
      })
      const otherUser = await insertTestUser()
      await insertTestConfig({
        userId: otherUser.id,
        endpointId: otherEndpoint.id,
        deviceTypeId: configDeviceType.id,
        status: "active",
        clientIdentifier: fakeConfigData.clientIp,
      })
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(parsed.data.clientIp).toBe(fakeConfigData.clientIp)
    })

    it("creates a second config on the same endpoint with a distinct client identifier", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      await callCreateUserConfig(
        { name: "First Device", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
        headers,
      )

      await callCreateUserConfig(
        { name: "Second Device", endpointId: configEndpoint.id, deviceTypeId: configDeviceType.id },
        headers,
      )

      const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
      expect(configRows).toHaveLength(2)
      expect(configRows.every((row) => row.status === "active")).toBe(true)
      const clientIdentifiers = configRows.map((row) => row.clientIdentifier)
      expect(new Set(clientIdentifiers).size).toBe(2)
      const { networkNumber, broadcastNumber } = parseIpSubnet(
        FakeAmneziawg3EndpointActualState.subnet,
      )
      expect(
        clientIdentifiers.every((clientIdentifier) => {
          const address = convertIpToNumber(clientIdentifier ?? "")
          return address > networkNumber && address < broadcastNumber
        }),
      ).toBe(true)
    })

    it("allocates the lowest free client identifier when a gap is left between taken ones", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const { networkNumber } = parseIpSubnet(FakeAmneziawg3EndpointActualState.subnet)
      const gapAddress = convertNumberToIp(networkNumber + FIRST_CLIENT_ADDRESS_OFFSET + 1)
      const otherUser = await insertTestUser()
      for (const offset of [FIRST_CLIENT_ADDRESS_OFFSET, FIRST_CLIENT_ADDRESS_OFFSET + 2]) {
        await insertTestConfig({
          userId: otherUser.id,
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
          clientIdentifier: convertNumberToIp(networkNumber + offset),
        })
      }
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(parsed.data.clientIp).toBe(gapAddress)
    })

    it("allocates the address past the octet boundary when every address below it is taken", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const { networkNumber } = parseIpSubnet(FakeAmneziawg3EndpointActualState.subnet)
      const otherUser = await insertTestUser()
      await db.insert(config).values(
        Array.from(
          { length: ADDRESSES_PER_OCTET - FIRST_CLIENT_ADDRESS_OFFSET },
          (_unused, index) => ({
            userId: otherUser.id,
            endpointId: configEndpoint.id,
            deviceTypeId: configDeviceType.id,
            name: `Occupying Config ${index}`,
            data: fakeConfigData,
            status: "active" as const,
            clientIdentifier: convertNumberToIp(
              networkNumber + FIRST_CLIENT_ADDRESS_OFFSET + index,
            ),
          }),
        ),
      )
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const createdConfig = await callCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      const parsed = CreateUserConfigOutputSchema.parse(createdConfig)
      expect(parsed.data.clientIp).toBe(convertNumberToIp(networkNumber + ADDRESSES_PER_OCTET))
    })

    it("returns FAILED when the endpoint actual state has no dns", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
        endpoint: { data: { actualState: endpointActualStateWithoutDns } },
      })
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      await expectOrpcError(
        callCreateUserConfig(
          {
            name: "Created Config",
            endpointId: configEndpoint.id,
            deviceTypeId: configDeviceType.id,
          },
          headers,
        ),
        "FAILED",
      )

      const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
      expect(configRows).toHaveLength(0)
      expect(fakeAmneziawg3Client.createAccess).not.toHaveBeenCalled()
    })
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the config insert query throws", async () => {
      vi.mocked(insertUserConfig).mockRejectedValueOnce(new Error("Insert failure"))
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)

      const response = await requestCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      expect(response.status).toBe(500)
    })

    it("returns FAILED when the endpoint is deleted between validation and protocol client resolution", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      vi.mocked(findEndpointProtocolClientData).mockResolvedValueOnce(undefined)

      await expectOrpcError(
        callCreateUserConfig(
          {
            name: "Created Config",
            endpointId: configEndpoint.id,
            deviceTypeId: configDeviceType.id,
          },
          headers,
        ),
        "FAILED",
      )
    })

    it("rejects the creation with UNSUPPORTED_PROTOCOL and leaves no config row when the endpoint protocol client resolution reports an unsupported protocol", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      vi.mocked(findEndpointProtocolClientData).mockResolvedValueOnce(unsupportedProtocolClientData)

      await expectOrpcError(
        callCreateUserConfig(
          {
            name: "Created Config",
            endpointId: configEndpoint.id,
            deviceTypeId: configDeviceType.id,
          },
          headers,
        ),
        "UNSUPPORTED_PROTOCOL",
      )

      const configRows = await db.select().from(config).where(eq(config.userId, requestUser.id))
      expect(configRows).toHaveLength(0)
    })

    it("responds with HTTP 400 when the endpoint protocol is unsupported", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const requestUser = await insertTestUser()
      const headers = await insertTestSession(requestUser)
      vi.mocked(findEndpointProtocolClientData).mockResolvedValueOnce(unsupportedProtocolClientData)

      const response = await requestCreateUserConfig(
        {
          name: "Created Config",
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        headers,
      )

      expect(response.status).toBe(400)
    })

    it.todo(
      "rejects the creation with PROTOCOL_OPTIONS_MISMATCH without writing a config row or calling the node when the resolved endpoint protocol differs from the protocolOptions protocol",
    )

    it.todo("responds with HTTP 400 when the protocol options do not match the endpoint protocol")
  })
})
