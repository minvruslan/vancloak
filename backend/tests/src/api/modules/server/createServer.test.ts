import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import { type Protocol, ServerSchema, type UpsertServer } from "@vancloak/api-contract"
import {
  ProtocolCodeSchema,
  ProtocolRegistry,
  ServerDataSchema,
} from "@vancloak/infrastructure/shared"
import { eq } from "drizzle-orm"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import app from "@/api/app.js"
import { serverRouter } from "@/api/modules/server/index.js"
import { deleteServer } from "@/api/modules/server/queries/deleteServer.js"
import { findProtocolCodes } from "@/api/modules/server/queries/findProtocolCodes.js"
import { insertServer } from "@/api/modules/server/queries/insertServer.js"
import { db } from "@/core/database/index.js"
import { endpoint, server } from "@/core/database/schemas/index.js"
import {
  ProvisionServerJobName,
  provisionServerQueue,
} from "@/core/queue/provision-server/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
  signInTestAdmin,
} from "@tests/helpers/index.js"

vi.mock("@/core/queue/provision-server/index.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/core/queue/provision-server/index.js")>()
  return { ...original, provisionServerQueue: vi.fn(original.provisionServerQueue) }
})

vi.mock("@/api/modules/server/queries/insertServer.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/server/queries/insertServer.js")>()
  return { insertServer: vi.fn(original.insertServer) }
})

vi.mock("@/api/modules/server/queries/deleteServer.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/server/queries/deleteServer.js")>()
  return { deleteServer: vi.fn(original.deleteServer) }
})

vi.mock("@/api/modules/server/queries/findProtocolCodes.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/server/queries/findProtocolCodes.js")>()
  return { findProtocolCodes: vi.fn(original.findProtocolCodes) }
})

function callCreateServer(input: unknown, headers: Headers) {
  return call(serverRouter.createServer, input as UpsertServer, { context: { headers } })
}

function requestCreateServer(input: Record<string, unknown>, headers: Headers) {
  headers.set("content-type", "application/json")
  return app.request("/api/servers", { method: "POST", headers, body: JSON.stringify(input) })
}

function createServerInput(overrides: Record<string, unknown> = {}) {
  return {
    name: `srv-${randomUUID().slice(0, 8)}`,
    ip: "192.0.2.10",
    country: "NL",
    credentials: { username: "vancloak", password: "server-password" },
    ...overrides,
  }
}

function createServerInputWithout(omittedField: keyof ReturnType<typeof createServerInput>) {
  const input: Record<string, unknown> = createServerInput()
  delete input[omittedField]
  return input
}

function createUnavailableQueue() {
  return {
    add: vi.fn().mockRejectedValue(new Error("Queue unavailable")),
  } as unknown as ReturnType<typeof provisionServerQueue>
}

const realProvisionServerQueue = provisionServerQueue()

describe("POST /servers", () => {
  beforeEach(async () => {
    await realProvisionServerQueue.obliterate({ force: true })
  })

  afterAll(async () => {
    await realProvisionServerQueue.obliterate({ force: true })
    await realProvisionServerQueue.close()
  })

  it("responds with HTTP 201 on success", async () => {
    const response = await requestCreateServer(createServerInput(), await signInTestAdmin())

    expect(response.status).toBe(201)
  })

  it("returns every contract field at every nesting level with the endpoint protocol family matching its code", async () => {
    const expectedFamiliesByCode: Record<Protocol["code"], Protocol["family"]> = {
      [ProtocolCodeSchema.enum.amneziawg3]: ProtocolRegistry.amneziawg3.family,
    }
    const serverProtocol = await insertTestProtocol()

    const createdServer = await callCreateServer(
      createServerInput({ endpoints: [{ protocolId: serverProtocol.id, port: 51820 }] }),
      await signInTestAdmin(),
    )

    expect(Object.keys(createdServer).sort()).toEqual([
      "country",
      "createdAt",
      "domainName",
      "endpoints",
      "id",
      "ip",
      "isCurrent",
      "name",
      "status",
      "updatedAt",
    ])
    expect(createdServer.endpoints).toHaveLength(1)
    for (const serverEndpoint of createdServer.endpoints) {
      expect(Object.keys(serverEndpoint).sort()).toEqual(["id", "port", "protocol", "status"])
      expect(Object.keys(serverEndpoint.protocol).sort()).toEqual(["code", "family", "id", "name"])
      expect(serverEndpoint.protocol.family).toBe(
        expectedFamiliesByCode[serverEndpoint.protocol.code],
      )
    }
  })

  it("returns the created server with status provisioning, isCurrent false, an empty endpoints array and a null domainName, persists the row and enqueues a provision-server job", async () => {
    const input = createServerInput()

    const createdServer = await callCreateServer(input, await signInTestAdmin())

    const parsed = ServerSchema.parse(createdServer)
    expect(parsed.status).toBe("provisioning")
    expect(parsed.isCurrent).toBe(false)
    expect(parsed.endpoints).toEqual([])
    expect(parsed.domainName).toBeNull()

    const serverRows = await db.select().from(server).where(eq(server.id, createdServer.id))
    expect(serverRows).toHaveLength(1)
    expect(serverRows[0]?.status).toBe("provisioning")
    expect(serverRows[0]?.name).toBe(input.name)
    expect(serverRows[0]?.ip).toBe(input.ip)
    expect(serverRows[0]?.country).toBe(input.country)

    const provisionServerJob = await provisionServerQueue().getJob(createdServer.id)
    expect(provisionServerJob).toBeDefined()
    expect(provisionServerJob?.name).toBe(ProvisionServerJobName)
    expect(provisionServerJob?.data).toEqual({ serverId: createdServer.id })
  })

  it("persists the ssh credentials into the server data column and does not expose them in the response", async () => {
    const ip = "198.51.100.7"
    const username = `user-${randomUUID()}`
    const password = `password-${randomUUID()}`

    const createdServer = await callCreateServer(
      createServerInput({ ip, credentials: { username, password } }),
      await signInTestAdmin(),
    )

    ServerSchema.parse(createdServer)
    const serialized = JSON.stringify(createdServer)
    expect(serialized).not.toContain(username)
    expect(serialized).not.toContain(password)
    expect(serialized).not.toContain("credentials")

    const serverRows = await db.select().from(server).where(eq(server.id, createdServer.id))
    expect(serverRows).toHaveLength(1)
    const persistedServerData = ServerDataSchema.parse(serverRows[0]?.data)
    expect(persistedServerData.actualState.ssh).toEqual({
      type: "password",
      username,
      password,
      port: 22,
    })

    expect(serverRows[0]?.ip).toBe(ip)
  })

  it("persists an active endpoint row for each provided endpoint with its port", async () => {
    const serverProtocol = await insertTestProtocol()

    const createdServer = await callCreateServer(
      createServerInput({ endpoints: [{ protocolId: serverProtocol.id, port: 51821 }] }),
      await signInTestAdmin(),
    )

    const endpointRows = await db
      .select()
      .from(endpoint)
      .where(eq(endpoint.serverId, createdServer.id))
    expect(endpointRows).toHaveLength(1)
    expect(endpointRows[0]?.port).toBe(51821)
    expect(endpointRows[0]?.protocolId).toBe(serverProtocol.id)
    expect(endpointRows[0]?.status).toBe("active")
  })

  it("uses the protocol registry default port when the endpoint port is omitted", async () => {
    const serverProtocol = await insertTestProtocol()

    const createdServer = await callCreateServer(
      createServerInput({ endpoints: [{ protocolId: serverProtocol.id }] }),
      await signInTestAdmin(),
    )

    const parsed = ServerSchema.parse(createdServer)
    expect(parsed.endpoints).toHaveLength(1)
    expect(parsed.endpoints[0]?.port).toBe(ProtocolRegistry.amneziawg3.defaultPort)
  })

  it("persists a provided domainName and returns it", async () => {
    const domainName = `node-${randomUUID()}.vancloak.test`

    const createdServer = await callCreateServer(
      createServerInput({ domainName }),
      await signInTestAdmin(),
    )

    const parsed = ServerSchema.parse(createdServer)
    expect(parsed.domainName).toBe(domainName)
    const serverRows = await db.select().from(server).where(eq(server.id, createdServer.id))
    expect(serverRows).toHaveLength(1)
    expect(serverRows[0]?.domainName).toBe(domainName)
  })

  it("rejects a payload without credentials with CREDENTIALS_REQUIRED and does not insert rows or enqueue a job", async () => {
    await expectOrpcError(
      callCreateServer(createServerInputWithout("credentials"), await signInTestAdmin()),
      "CREDENTIALS_REQUIRED",
    )

    expect(await db.select().from(server)).toHaveLength(0)
    expect(await db.select().from(endpoint)).toHaveLength(0)
    expect(await provisionServerQueue().getJobs()).toHaveLength(0)
  })

  it("rejects an endpoint with an unknown protocolId with PROTOCOL_NOT_FOUND and does not insert rows or enqueue a job", async () => {
    await insertTestProtocol()

    await expectOrpcError(
      callCreateServer(
        createServerInput({ endpoints: [{ protocolId: randomUUID(), port: 51820 }] }),
        await signInTestAdmin(),
      ),
      "PROTOCOL_NOT_FOUND",
    )

    expect(await db.select().from(server)).toHaveLength(0)
    expect(await db.select().from(endpoint)).toHaveLength(0)
    expect(await provisionServerQueue().getJobs()).toHaveLength(0)
  })

  it("rejects two endpoints with the same protocol with DUPLICATE_PROTOCOL and does not insert rows or enqueue a job", async () => {
    const serverProtocol = await insertTestProtocol()

    await expectOrpcError(
      callCreateServer(
        createServerInput({
          endpoints: [
            { protocolId: serverProtocol.id, port: 51820 },
            { protocolId: serverProtocol.id, port: 51821 },
          ],
        }),
        await signInTestAdmin(),
      ),
      "DUPLICATE_PROTOCOL",
    )

    expect(await db.select().from(server)).toHaveLength(0)
    expect(await db.select().from(endpoint)).toHaveLength(0)
    expect(await provisionServerQueue().getJobs()).toHaveLength(0)
  })

  it("rejects with ENQUEUE_FAILED and HTTP 502 when the queue is unavailable", async () => {
    vi.mocked(provisionServerQueue).mockReturnValueOnce(createUnavailableQueue())

    const response = await requestCreateServer(createServerInput(), await signInTestAdmin())

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ code: "ENQUEUE_FAILED" })
  })

  it("responds with HTTP 400 when credentials are missing", async () => {
    const response = await requestCreateServer(
      createServerInputWithout("credentials"),
      await signInTestAdmin(),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "CREDENTIALS_REQUIRED" })
  })

  it("responds with HTTP 409 for two endpoints with the same protocol", async () => {
    const serverProtocol = await insertTestProtocol()

    const response = await requestCreateServer(
      createServerInput({
        endpoints: [
          { protocolId: serverProtocol.id, port: 51820 },
          { protocolId: serverProtocol.id, port: 51821 },
        ],
      }),
      await signInTestAdmin(),
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "DUPLICATE_PROTOCOL" })
  })

  it("responds with HTTP 400 for an unknown protocolId", async () => {
    await insertTestProtocol()

    const response = await requestCreateServer(
      createServerInput({ endpoints: [{ protocolId: randomUUID(), port: 51820 }] }),
      await signInTestAdmin(),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "PROTOCOL_NOT_FOUND" })
  })

  it("deletes the created server and its endpoint rows and leaves another server with its endpoint untouched when the enqueue fails", async () => {
    const serverProtocol = await insertTestProtocol()
    const siblingServer = await insertTestServer()
    const siblingEndpoint = await insertTestEndpoint({
      serverId: siblingServer.id,
      protocolId: serverProtocol.id,
    })
    vi.mocked(provisionServerQueue).mockReturnValueOnce(createUnavailableQueue())

    await expectOrpcError(
      callCreateServer(
        createServerInput({ endpoints: [{ protocolId: serverProtocol.id, port: 51820 }] }),
        await signInTestAdmin(),
      ),
      "ENQUEUE_FAILED",
    )

    const serverRows = await db.select().from(server)
    expect(serverRows).toHaveLength(1)
    expect(serverRows[0]?.id).toBe(siblingServer.id)
    const endpointRows = await db.select().from(endpoint)
    expect(endpointRows).toHaveLength(1)
    expect(endpointRows[0]?.id).toBe(siblingEndpoint.id)
  })

  it("accepts a name of exactly 15 characters", async () => {
    const name = "n".repeat(15)

    const createdServer = await callCreateServer(
      createServerInput({ name }),
      await signInTestAdmin(),
    )

    const parsed = ServerSchema.parse(createdServer)
    expect(parsed.name).toBe(name)
  })

  it("accepts an endpoint with a port of exactly 65535", async () => {
    const serverProtocol = await insertTestProtocol()

    const createdServer = await callCreateServer(
      createServerInput({ endpoints: [{ protocolId: serverProtocol.id, port: 65535 }] }),
      await signInTestAdmin(),
    )

    const parsed = ServerSchema.parse(createdServer)
    expect(parsed.endpoints).toHaveLength(1)
    expect(parsed.endpoints[0]?.port).toBe(65535)
  })

  it("rejects an ordinary user with FORBIDDEN", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)

    await expectOrpcError(callCreateServer(createServerInput(), headers), "FORBIDDEN")
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the server insert throws", async () => {
      vi.mocked(insertServer).mockRejectedValueOnce(new Error("Insert failure"))

      const response = await requestCreateServer(createServerInput(), await signInTestAdmin())

      expect(response.status).toBe(500)
    })

    it("does not insert rows or enqueue a job when the server insert throws", async () => {
      vi.mocked(insertServer).mockRejectedValueOnce(new Error("Insert failure"))

      await expect(callCreateServer(createServerInput(), await signInTestAdmin())).rejects.toThrow()

      expect(await db.select().from(server)).toHaveLength(0)
      expect(await db.select().from(endpoint)).toHaveLength(0)
      expect(await provisionServerQueue().getJobs()).toHaveLength(0)
    })

    it("rejects with UNSUPPORTED_PROTOCOL and does not insert rows or enqueue a job when the protocol query returns an unknown code", async () => {
      const serverProtocol = await insertTestProtocol()
      vi.mocked(findProtocolCodes).mockResolvedValueOnce([
        { protocolId: serverProtocol.id, protocolCode: "unknown-protocol" },
      ])

      await expectOrpcError(
        callCreateServer(
          createServerInput({ endpoints: [{ protocolId: serverProtocol.id, port: 51820 }] }),
          await signInTestAdmin(),
        ),
        "UNSUPPORTED_PROTOCOL",
      )

      expect(await db.select().from(server)).toHaveLength(0)
      expect(await db.select().from(endpoint)).toHaveLength(0)
      expect(await provisionServerQueue().getJobs()).toHaveLength(0)
    })

    it("responds with HTTP 400 when the protocol query returns an unknown code", async () => {
      const serverProtocol = await insertTestProtocol()
      vi.mocked(findProtocolCodes).mockResolvedValueOnce([
        { protocolId: serverProtocol.id, protocolCode: "unknown-protocol" },
      ])

      const response = await requestCreateServer(
        createServerInput({ endpoints: [{ protocolId: serverProtocol.id, port: 51820 }] }),
        await signInTestAdmin(),
      )

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ code: "UNSUPPORTED_PROTOCOL" })
    })

    it("responds with ENQUEUE_FAILED when the enqueue fails and the rollback delete also throws", async () => {
      vi.mocked(provisionServerQueue).mockReturnValueOnce(createUnavailableQueue())
      vi.mocked(deleteServer).mockRejectedValueOnce(new Error("Delete failure"))

      await expectOrpcError(
        callCreateServer(createServerInput(), await signInTestAdmin()),
        "ENQUEUE_FAILED",
      )

      expect(await db.select().from(server)).toHaveLength(1)
    })
  })
})
