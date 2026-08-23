import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import {
  EndpointSchema,
  EndpointServerSchema,
  ProtocolSchema,
  ServerStatusSchema,
  type Protocol,
} from "@vancloak/api-contract"
import { ProtocolCodeSchema, ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import app from "@/api/app.js"
import { endpointRouter } from "@/api/modules/endpoint/index.js"
import { findActiveEndpoints } from "@/api/modules/endpoint/queries/findActiveEndpoints.js"
import {
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  signInTestAdmin,
  signInTestUser,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/endpoint/queries/findActiveEndpoints.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/endpoint/queries/findActiveEndpoints.js")>()
  return { findActiveEndpoints: vi.fn(original.findActiveEndpoints) }
})

function callGetEndpoints(headers: Headers) {
  return call(endpointRouter.getEndpoints, undefined, { context: { headers } })
}

describe("GET /endpoints", () => {
  it("returns active endpoints of active servers matching the contract schema", async () => {
    const expectedFamiliesByCode: Record<Protocol["code"], Protocol["family"]> = {
      [ProtocolCodeSchema.enum.amneziawg2]: ProtocolRegistry.amneziawg2.family,
    }
    const endpointProtocol = await insertTestProtocol()
    const endpointServer = await insertTestServer()
    const activeEndpoint = await insertTestEndpoint({
      serverId: endpointServer.id,
      protocolId: endpointProtocol.id,
    })

    const endpoints = await callGetEndpoints(await signInTestUser())

    const parsed = z.array(EndpointSchema).parse(endpoints)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe(activeEndpoint.id)
    expect(parsed[0].port).toBe(activeEndpoint.port)
    expect(parsed[0].protocol.id).toBe(endpointProtocol.id)
    expect(parsed[0].protocol.code).toBe(endpointProtocol.code)
    expect(parsed[0].protocol.name).toBe(endpointProtocol.name)
    expect(parsed[0].server.id).toBe(endpointServer.id)
    expect(parsed[0].server.name).toBe(endpointServer.name)
    expect(parsed[0].server.country).toBe(endpointServer.country)
    for (const entry of endpoints) {
      expect(Object.keys(entry).sort()).toEqual([...EndpointSchema.keyof().options].sort())
      expect(Object.keys(entry.protocol).sort()).toEqual([...ProtocolSchema.keyof().options].sort())
      expect(Object.keys(entry.server).sort()).toEqual(
        [...EndpointServerSchema.keyof().options].sort(),
      )
    }
    for (const entry of parsed) {
      expect(entry.protocol.family).toBe(expectedFamiliesByCode[entry.protocol.code])
    }
  })

  it.todo("returns one entry per active endpoint when a server hosts several protocols")

  it("omits endpoints of servers with status provisioning", async () => {
    const endpointProtocol = await insertTestProtocol()
    const controlServer = await insertTestServer()
    const controlEndpoint = await insertTestEndpoint({
      serverId: controlServer.id,
      protocolId: endpointProtocol.id,
    })
    const provisioningServer = await insertTestServer({
      status: ServerStatusSchema.enum.provisioning,
    })
    await insertTestEndpoint({
      serverId: provisioningServer.id,
      protocolId: endpointProtocol.id,
    })

    const endpoints = await callGetEndpoints(await signInTestUser())

    expect(endpoints.map((entry) => entry.id)).toEqual([controlEndpoint.id])
  })

  it("omits endpoints of servers with status failed", async () => {
    const endpointProtocol = await insertTestProtocol()
    const controlServer = await insertTestServer()
    const controlEndpoint = await insertTestEndpoint({
      serverId: controlServer.id,
      protocolId: endpointProtocol.id,
    })
    const failedServer = await insertTestServer({ status: ServerStatusSchema.enum.failed })
    await insertTestEndpoint({
      serverId: failedServer.id,
      protocolId: endpointProtocol.id,
    })

    const endpoints = await callGetEndpoints(await signInTestUser())

    expect(endpoints.map((entry) => entry.id)).toEqual([controlEndpoint.id])
  })

  it("keeps listing endpoints whose protocol is disabled", async () => {
    const disabledProtocol = await insertTestProtocol({ isEnabled: false })
    const endpointServer = await insertTestServer()
    const disabledProtocolEndpoint = await insertTestEndpoint({
      serverId: endpointServer.id,
      protocolId: disabledProtocol.id,
    })

    const endpoints = await callGetEndpoints(await signInTestUser())

    const parsed = z.array(EndpointSchema).parse(endpoints)
    expect(parsed.map((entry) => entry.id)).toEqual([disabledProtocolEndpoint.id])
  })

  it("returns entries ordered by server name ascending case-insensitively", async () => {
    const endpointProtocol = await insertTestProtocol()
    const bravoServer = await insertTestServer({
      name: `Bravo Server ${randomUUID()}`,
      country: "BB",
    })
    const charlieServer = await insertTestServer({
      name: `charlie server ${randomUUID()}`,
      country: "AA",
    })
    const alphaServer = await insertTestServer({
      name: `alpha server ${randomUUID()}`,
      country: "CC",
    })
    await insertTestEndpoint({ serverId: bravoServer.id, protocolId: endpointProtocol.id })
    await insertTestEndpoint({ serverId: charlieServer.id, protocolId: endpointProtocol.id })
    await insertTestEndpoint({ serverId: alphaServer.id, protocolId: endpointProtocol.id })

    const endpoints = await callGetEndpoints(await signInTestUser())

    expect(endpoints.map((entry) => entry.server.name)).toEqual([
      alphaServer.name,
      bravoServer.name,
      charlieServer.name,
    ])
  })

  it("returns entries with equal server names ordered by port ascending", async () => {
    const endpointProtocol = await insertTestProtocol()
    const sharedServerName = `Shared Server ${randomUUID()}`
    const firstServer = await insertTestServer({ name: sharedServerName })
    const secondServer = await insertTestServer({ name: sharedServerName })
    const higherPortEndpoint = await insertTestEndpoint({
      serverId: firstServer.id,
      protocolId: endpointProtocol.id,
      port: 51821,
    })
    const lowerPortEndpoint = await insertTestEndpoint({
      serverId: secondServer.id,
      protocolId: endpointProtocol.id,
      port: 51820,
    })

    const endpoints = await callGetEndpoints(await signInTestUser())

    expect(endpoints.map((entry) => entry.id)).toEqual([
      lowerPortEndpoint.id,
      higherPortEndpoint.id,
    ])
  })

  it("returns an empty array when no endpoints exist", async () => {
    const endpoints = await callGetEndpoints(await signInTestUser())

    expect(endpoints).toEqual([])
  })

  it("allows an admin user as well", async () => {
    const endpointProtocol = await insertTestProtocol()
    const endpointServer = await insertTestServer()
    const activeEndpoint = await insertTestEndpoint({
      serverId: endpointServer.id,
      protocolId: endpointProtocol.id,
    })

    const endpoints = await callGetEndpoints(await signInTestAdmin())

    expect(endpoints.map((entry) => entry.id)).toEqual([activeEndpoint.id])
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the endpoint query throws", async () => {
      vi.mocked(findActiveEndpoints).mockRejectedValueOnce(new Error("Query failure"))

      const response = await app.request("/api/endpoints", {
        headers: await signInTestUser(),
      })
      expect(response.status).toBe(500)
    })
  })
})
