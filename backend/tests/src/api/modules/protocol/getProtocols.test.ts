import { call } from "@orpc/server"
import { ProtocolSchema, type Protocol } from "@vancloak/api-contract"
import { ProtocolCodeSchema, ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import app from "@/api/app.js"
import { protocolRouter } from "@/api/modules/protocol/index.js"
import { findActiveProtocols } from "@/api/modules/protocol/queries/findActiveProtocols.js"
import { bootstrapProtocols } from "@/core/bootstraps/bootstrapProtocols.js"
import {
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  signInTestAdmin,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/protocol/queries/findActiveProtocols.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/api/modules/protocol/queries/findActiveProtocols.js")>()
  return { findActiveProtocols: vi.fn(original.findActiveProtocols) }
})

function callGetProtocols(headers: Headers) {
  return call(protocolRouter.getProtocols, undefined, { context: { headers } })
}

describe("GET /protocols", () => {
  it("returns the enabled protocol catalog matching the contract schema", async () => {
    const expectedFamiliesByCode: Record<Protocol["code"], Protocol["family"]> = {
      [ProtocolCodeSchema.enum.amneziawg2]: ProtocolRegistry.amneziawg2.family,
    }
    await bootstrapProtocols()

    const protocols = await callGetProtocols(await signInTestAdmin())

    const parsed = z.array(ProtocolSchema).parse(protocols)
    expect(parsed).toHaveLength(ProtocolCodeSchema.options.length)
    expect(parsed.map((entry) => entry.code).sort()).toEqual([...ProtocolCodeSchema.options].sort())
    for (const entry of protocols) {
      expect(Object.keys(entry).sort()).toEqual([...ProtocolSchema.keyof().options].sort())
    }
    for (const entry of parsed) {
      expect(entry.family).toBe(expectedFamiliesByCode[entry.code])
      expect(entry.name).toBe(ProtocolRegistry[entry.code].name)
    }
  })

  it("keeps a disabled protocol hidden even when it has active endpoints", async () => {
    const disabledProtocol = await insertTestProtocol({ isEnabled: false })
    const endpointServer = await insertTestServer()
    await insertTestEndpoint({
      serverId: endpointServer.id,
      protocolId: disabledProtocol.id,
    })

    const protocols = await callGetProtocols(await signInTestAdmin())

    expect(protocols).toEqual([])
  })

  it("returns an empty array when all protocols are disabled", async () => {
    await insertTestProtocol({ isEnabled: false })

    const protocols = await callGetProtocols(await signInTestAdmin())

    expect(protocols).toEqual([])
  })

  it("returns an empty array when no protocols exist", async () => {
    const protocols = await callGetProtocols(await signInTestAdmin())

    expect(protocols).toEqual([])
  })

  describe("technical", () => {
    it("responds with HTTP 500 when the protocol query throws", async () => {
      vi.mocked(findActiveProtocols).mockRejectedValueOnce(new Error("Query failure"))

      const response = await app.request("/api/protocols", {
        headers: await signInTestAdmin(),
      })
      expect(response.status).toBe(500)
    })
  })
})
