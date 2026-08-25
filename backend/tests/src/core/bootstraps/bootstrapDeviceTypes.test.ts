import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DeviceTypes } from "@/core/bootstraps/constants/index.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import { deviceType } from "@/core/database/schemas/index.js"

function sortByCode<Row extends { code: string }>(rows: Row[]) {
  return [...rows].sort((left, right) => left.code.localeCompare(right.code))
}

describe("bootstrapDeviceTypes", () => {
  it("seeds every device type from the catalog enabled", async () => {
    await bootstrapDeviceTypes()

    const deviceTypeRows = await db.select().from(deviceType)
    expect(
      sortByCode(deviceTypeRows.map(({ code, name, sortOrder }) => ({ code, name, sortOrder }))),
    ).toEqual(sortByCode(DeviceTypes))
    expect(deviceTypeRows.every((row) => row.isEnabled)).toBe(true)
  })

  it("touches nothing on a second run", async () => {
    await bootstrapDeviceTypes()
    const seededRows = await db.select().from(deviceType)

    await bootstrapDeviceTypes()

    const deviceTypeRows = await db.select().from(deviceType)
    expect(sortByCode(deviceTypeRows)).toEqual(sortByCode(seededRows))
  })

  it("adds the missing device types to a partially seeded catalog keeping existing rows", async () => {
    const catalogEntry = DeviceTypes[0]
    await db.insert(deviceType).values(catalogEntry)
    const [existingDeviceType] = await db.select().from(deviceType)

    await bootstrapDeviceTypes()

    const deviceTypeRows = await db.select().from(deviceType)
    expect(sortByCode(deviceTypeRows).map((row) => row.code)).toEqual(
      sortByCode(DeviceTypes).map((entry) => entry.code),
    )
    const existingRows = deviceTypeRows.filter((row) => row.code === catalogEntry.code)
    expect(existingRows).toEqual([existingDeviceType])
  })

  it("restores the catalog name of a renamed device type", async () => {
    await bootstrapDeviceTypes()
    const [catalogEntry, otherCatalogEntry] = DeviceTypes
    await db
      .update(deviceType)
      .set({ name: otherCatalogEntry.name })
      .where(eq(deviceType.code, catalogEntry.code))

    await bootstrapDeviceTypes()

    const [restoredDeviceType] = await db
      .select()
      .from(deviceType)
      .where(eq(deviceType.code, catalogEntry.code))
    expect(restoredDeviceType.name).toBe(catalogEntry.name)
  })

  it("keeps a device type disabled by an operator on a later run", async () => {
    await bootstrapDeviceTypes()
    const [disabledDeviceType] = await db.select().from(deviceType).limit(1)
    await db
      .update(deviceType)
      .set({ isEnabled: false })
      .where(eq(deviceType.id, disabledDeviceType.id))

    await bootstrapDeviceTypes()

    const deviceTypeRows = await db.select().from(deviceType)
    const disabledRows = deviceTypeRows.filter((row) => row.isEnabled === false)
    expect(disabledRows.map((row) => row.id)).toEqual([disabledDeviceType.id])
    expect(deviceTypeRows.length).toBeGreaterThan(1)
  })
})
