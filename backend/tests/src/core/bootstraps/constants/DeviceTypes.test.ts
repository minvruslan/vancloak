import { describe, expect, it } from "vitest"
import { DeviceTypes } from "@/core/bootstraps/constants/index.js"
import { fetchCheckConstraintValues } from "@tests/helpers/index.js"

describe("DeviceTypes", () => {
  it("matches the allowed codes of the device_type_code_check constraint", async () => {
    const allowedCodes = await fetchCheckConstraintValues("device_type_code_check")

    expect([...allowedCodes].sort()).toEqual(DeviceTypes.map((entry) => entry.code).sort())
  })

  it("matches the allowed names of the device_type_name_check constraint", async () => {
    const allowedNames = await fetchCheckConstraintValues("device_type_name_check")

    expect([...allowedNames].sort()).toEqual(DeviceTypes.map((entry) => entry.name).sort())
  })
})
