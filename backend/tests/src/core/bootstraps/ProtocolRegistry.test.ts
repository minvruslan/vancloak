import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { describe, expect, it } from "vitest"
import { fetchCheckConstraintValues } from "@tests/helpers/index.js"

describe("ProtocolRegistry", () => {
  it("matches the allowed codes of the protocol_code_check constraint", async () => {
    const allowedCodes = await fetchCheckConstraintValues("protocol_code_check")

    expect([...allowedCodes].sort()).toEqual(Object.keys(ProtocolRegistry).sort())
  })

  it("matches the allowed families of the protocol_family_check constraint", async () => {
    const allowedFamilies = await fetchCheckConstraintValues("protocol_family_check")

    const registryFamilies = [
      ...new Set(Object.values(ProtocolRegistry).map((entry) => entry.family)),
    ]
    expect([...allowedFamilies].sort()).toEqual(registryFamilies.sort())
  })
})
