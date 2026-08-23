import { eq } from "drizzle-orm"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { describe, expect, it } from "vitest"
import { runBootstraps } from "@/core/bootstraps/index.js"
import { db } from "@/core/database/index.js"
import { deviceType, protocol, server, user } from "@/core/database/schemas/index.js"

describe("runBootstraps", () => {
  it("runs every bootstrap", async () => {
    await runBootstraps()

    expect(await db.select().from(user).where(eq(user.role, "admin"))).toHaveLength(1)
    expect(await db.select().from(server).where(eq(server.isCurrent, true))).toHaveLength(1)
    expect((await db.select().from(deviceType)).length).toBeGreaterThan(0)
    expect(await db.select().from(protocol)).toHaveLength(Object.keys(ProtocolRegistry).length)
  })

  it("creates no duplicates and fails no run when two starts run in parallel", async () => {
    await Promise.all([runBootstraps(), runBootstraps()])

    expect(await db.select().from(user).where(eq(user.role, "admin"))).toHaveLength(1)
    expect(await db.select().from(server).where(eq(server.isCurrent, true))).toHaveLength(1)
  })
})
