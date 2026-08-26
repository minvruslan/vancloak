import { randomUUID } from "node:crypto"
import { call } from "@orpc/server"
import { RemoteServer } from "@vancloak/infrastructure"
import { ProtocolRegistry } from "@vancloak/infrastructure/shared"
import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import app from "@/api/app.js"
import { userRouter } from "@/api/modules/user/index.js"
import { deleteUser } from "@/api/modules/user/queries/deleteUser.js"
import { bootstrapDeviceTypes } from "@/core/bootstraps/bootstrapDeviceTypes.js"
import { db } from "@/core/database/index.js"
import {
  config,
  configLimit,
  deviceType,
  server,
  session,
  user,
} from "@/core/database/schemas/index.js"
import { expectOrpcError } from "@tests/assertions/index.js"
import {
  createFakeAmneziawg3Client,
  insertTestConfig,
  insertTestConfigLimit,
  insertTestEndpoint,
  insertTestProtocol,
  insertTestServer,
  insertTestSession,
  insertTestUser,
  signInTestAdmin,
  waitForDatabaseLockWaiter,
} from "@tests/helpers/index.js"

vi.mock("@/api/modules/user/queries/deleteUser.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/modules/user/queries/deleteUser.js")>()
  return { deleteUser: vi.fn(original.deleteUser) }
})

function callDeleteUser(id: string, headers: Headers) {
  return call(userRouter.deleteUser, { id }, { context: { headers } })
}

async function insertConfigPrerequisites(
  overrides: {
    server?: Partial<typeof server.$inferInsert>
  } = {},
) {
  const configProtocol = await insertTestProtocol()
  const configServer = await insertTestServer(overrides.server)
  const configEndpoint = await insertTestEndpoint({
    serverId: configServer.id,
    protocolId: configProtocol.id,
  })
  const [configDeviceType] = await db.select().from(deviceType).limit(1)
  return { configEndpoint, configDeviceType }
}

let fakeAmneziawg3Client: ReturnType<typeof createFakeAmneziawg3Client>

describe("DELETE /users/{id}", () => {
  beforeEach(async () => {
    fakeAmneziawg3Client = createFakeAmneziawg3Client()
    vi.spyOn(RemoteServer.prototype, "getProtocolClient").mockReturnValue(
      fakeAmneziawg3Client.client,
    )
    await bootstrapDeviceTypes()
  })

  it("deletes the user, returns their id, removes the user row and makes no node calls when the user has no configs", async () => {
    const targetUser = await insertTestUser()

    const deleteUserResult = await callDeleteUser(targetUser.id, await signInTestAdmin())

    const parsed = z.object({ id: z.string() }).parse(deleteUserResult)
    expect(parsed).toEqual({ id: targetUser.id })
    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(0)
    expect(fakeAmneziawg3Client.deleteAccesses).not.toHaveBeenCalled()
  })

  it("removes the user's config limits", async () => {
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })

    await callDeleteUser(targetUser.id, await signInTestAdmin())

    const configLimitRows = await db
      .select()
      .from(configLimit)
      .where(eq(configLimit.userId, targetUser.id))
    expect(configLimitRows).toHaveLength(0)
  })

  it("removes the user's sessions", async () => {
    const targetUser = await insertTestUser()
    await insertTestSession(targetUser)

    await callDeleteUser(targetUser.id, await signInTestAdmin())

    const sessionRows = await db.select().from(session).where(eq(session.userId, targetUser.id))
    expect(sessionRows).toHaveLength(0)
  })

  it("removes the user's config rows", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    await callDeleteUser(targetUser.id, await signInTestAdmin())

    const configRows = await db.select().from(config).where(eq(config.userId, targetUser.id))
    expect(configRows).toHaveLength(0)
  })

  it("deletes a user whose used count exceeds their limit's maxCount", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 0,
    })
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const deleteUserResult = await callDeleteUser(targetUser.id, await signInTestAdmin())

    expect(deleteUserResult).toEqual({ id: targetUser.id })
    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(0)
  })

  it("deletes a user who has configs of a protocol family without a config limit row", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const deleteUserResult = await callDeleteUser(targetUser.id, await signInTestAdmin())

    expect(deleteUserResult).toEqual({ id: targetUser.id })
    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(0)
  })

  it("rejects an unknown id with NOT_FOUND", async () => {
    await expectOrpcError(
      callDeleteUser(`unknown-user-${randomUUID()}`, await signInTestAdmin()),
      "NOT_FOUND",
    )

    expect(fakeAmneziawg3Client.deleteAccesses).not.toHaveBeenCalled()
  })

  it("returns CONFIG_DELETE_FAILED and keeps the user, their limits and their configs when a node holding the user's configs is unreachable", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      server: { data: null },
    })
    const targetUser = await insertTestUser()
    await insertTestConfigLimit({
      userId: targetUser.id,
      protocolFamily: ProtocolRegistry.amneziawg3.family,
      maxCount: 3,
    })
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    await expectOrpcError(
      callDeleteUser(targetUser.id, await signInTestAdmin()),
      "CONFIG_DELETE_FAILED",
    )

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    const configLimitRows = await db
      .select()
      .from(configLimit)
      .where(eq(configLimit.userId, targetUser.id))
    expect(configLimitRows).toHaveLength(1)
    const configRows = await db.select().from(config).where(eq(config.userId, targetUser.id))
    expect(configRows).toHaveLength(1)
    expect(configRows[0].status).toBe("deleting")
    expect(fakeAmneziawg3Client.deleteAccesses).not.toHaveBeenCalled()
  })

  it("responds with HTTP 502 when node config deletion fails", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites({
      server: { data: null },
    })
    const targetUser = await insertTestUser()
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    const response = await app.request(`/api/users/${targetUser.id}`, {
      method: "DELETE",
      headers: await signInTestAdmin(),
    })

    expect(response.status).toBe(502)
  })

  it("deletes configs on the reachable node and returns CONFIG_DELETE_FAILED when another node fails", async () => {
    const configProtocol = await insertTestProtocol()
    const reachableServer = await insertTestServer()
    const unreachableServer = await insertTestServer({ data: null })
    const reachableEndpoint = await insertTestEndpoint({
      serverId: reachableServer.id,
      protocolId: configProtocol.id,
    })
    const unreachableEndpoint = await insertTestEndpoint({
      serverId: unreachableServer.id,
      protocolId: configProtocol.id,
    })
    const [configDeviceType] = await db.select().from(deviceType).limit(1)
    const targetUser = await insertTestUser()
    const reachableConfig = await insertTestConfig({
      userId: targetUser.id,
      endpointId: reachableEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    const unreachableConfig = await insertTestConfig({
      userId: targetUser.id,
      endpointId: unreachableEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })

    await expectOrpcError(
      callDeleteUser(targetUser.id, await signInTestAdmin()),
      "CONFIG_DELETE_FAILED",
    )

    expect(fakeAmneziawg3Client.deleteAccesses).toHaveBeenCalledTimes(1)
    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    const reachableConfigRows = await db
      .select()
      .from(config)
      .where(eq(config.id, reachableConfig.id))
    expect(reachableConfigRows).toHaveLength(0)
    const unreachableConfigRows = await db
      .select()
      .from(config)
      .where(eq(config.id, unreachableConfig.id))
    expect(unreachableConfigRows).toHaveLength(1)
    expect(unreachableConfigRows[0].status).toBe("deleting")
  })

  it("returns CONFIGS_APPEARED, keeps the user and the appeared config and removes the original config when a new config is created for the user during deletion", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    const targetConfig = await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    let appearedConfigId = ""
    fakeAmneziawg3Client.deleteAccesses.mockImplementationOnce(async () => {
      const appearedConfig = await insertTestConfig({
        userId: targetUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
      })
      appearedConfigId = appearedConfig.id
    })

    await expectOrpcError(
      callDeleteUser(targetUser.id, await signInTestAdmin()),
      "CONFIGS_APPEARED",
    )

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    expect(fakeAmneziawg3Client.deleteAccesses).toHaveBeenCalledTimes(1)
    const targetConfigRows = await db.select().from(config).where(eq(config.id, targetConfig.id))
    expect(targetConfigRows).toHaveLength(0)
    const appearedConfigRows = await db.select().from(config).where(eq(config.id, appearedConfigId))
    expect(appearedConfigRows).toHaveLength(1)
  })

  it("responds with HTTP 409 when configs appeared during deletion", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    await insertTestConfig({
      userId: targetUser.id,
      endpointId: configEndpoint.id,
      deviceTypeId: configDeviceType.id,
    })
    fakeAmneziawg3Client.deleteAccesses.mockImplementationOnce(async () => {
      await insertTestConfig({
        userId: targetUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
      })
    })

    const response = await app.request(`/api/users/${targetUser.id}`, {
      method: "DELETE",
      headers: await signInTestAdmin(),
    })

    expect(response.status).toBe(409)
  })

  it("waits for the user advisory lock and rejects with CONFIGS_APPEARED after a concurrent config insert commits", async () => {
    const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
    const targetUser = await insertTestUser()
    const headers = await signInTestAdmin()

    let releaseConfigInsert!: () => void
    let markConfigInsertHeld!: () => void
    const configInsertReleased = new Promise<void>((resolve) => {
      releaseConfigInsert = resolve
    })
    const configInsertHeld = new Promise<void>((resolve) => {
      markConfigInsertHeld = resolve
    })

    let appearedConfigId = ""
    const configInsertTransaction = db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${targetUser.id}))`)
      const appearedConfig = await insertTestConfig(
        {
          userId: targetUser.id,
          endpointId: configEndpoint.id,
          deviceTypeId: configDeviceType.id,
        },
        tx,
      )
      appearedConfigId = appearedConfig.id
      markConfigInsertHeld()
      await configInsertReleased
    })

    await configInsertHeld
    const deleteUserResult = callDeleteUser(targetUser.id, headers)
    await waitForDatabaseLockWaiter(deleteUserResult)
    releaseConfigInsert()
    await configInsertTransaction

    await expectOrpcError(deleteUserResult, "CONFIGS_APPEARED")
    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    const appearedConfigRows = await db.select().from(config).where(eq(config.id, appearedConfigId))
    expect(appearedConfigRows).toHaveLength(1)
    expect(fakeAmneziawg3Client.deleteAccesses).not.toHaveBeenCalled()
  })

  it("rejects deleting a user with role admin with NOT_FOUND", async () => {
    const adminUser = await insertTestUser({ role: "admin" })
    const headers = await insertTestSession(adminUser)

    await expectOrpcError(callDeleteUser(adminUser.id, headers), "NOT_FOUND")
    const userRows = await db.select().from(user).where(eq(user.id, adminUser.id))
    expect(userRows).toHaveLength(1)
    expect(fakeAmneziawg3Client.deleteAccesses).not.toHaveBeenCalled()
  })

  it("rejects an ordinary user with FORBIDDEN", async () => {
    const requestUser = await insertTestUser()
    const headers = await insertTestSession(requestUser)
    const targetUser = await insertTestUser()

    await expectOrpcError(callDeleteUser(targetUser.id, headers), "FORBIDDEN")

    const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
    expect(userRows).toHaveLength(1)
    expect(fakeAmneziawg3Client.deleteAccesses).not.toHaveBeenCalled()
  })

  describe("amneziawg3", () => {
    it("deletes the user's VPN configs on the nodes before removing the user", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const targetUser = await insertTestUser()
      const targetConfig = await insertTestConfig({
        userId: targetUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
      })
      let userRowsDuringNodeCall: { id: string }[] = []
      fakeAmneziawg3Client.deleteAccesses.mockImplementationOnce(async () => {
        userRowsDuringNodeCall = await db.select().from(user).where(eq(user.id, targetUser.id))
      })

      await callDeleteUser(targetUser.id, await signInTestAdmin())

      expect(fakeAmneziawg3Client.deleteAccesses).toHaveBeenCalledTimes(1)
      expect(fakeAmneziawg3Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
        targetConfig.data,
      ])
      expect(userRowsDuringNodeCall).toHaveLength(1)
      const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
      expect(userRows).toHaveLength(0)
    })

    it("invokes the remote endpoint deletion once with both configs and removes both config rows when the user has two configs on the same endpoint", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const targetUser = await insertTestUser()
      const firstConfig = await insertTestConfig({
        userId: targetUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
      })
      const secondConfig = await insertTestConfig({
        userId: targetUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
      })

      await callDeleteUser(targetUser.id, await signInTestAdmin())

      expect(fakeAmneziawg3Client.deleteAccesses).toHaveBeenCalledTimes(1)
      const [, deletedConfigData] = fakeAmneziawg3Client.deleteAccesses.mock.calls[0]
      expect(deletedConfigData).toHaveLength(2)
      expect(deletedConfigData).toContainEqual(firstConfig.data)
      expect(deletedConfigData).toContainEqual(secondConfig.data)
      const configRows = await db.select().from(config).where(eq(config.userId, targetUser.id))
      expect(configRows).toHaveLength(0)
    })

    it("leaves another user, their session, config limit and config untouched", async () => {
      const { configEndpoint, configDeviceType } = await insertConfigPrerequisites()
      const targetUser = await insertTestUser()
      const targetConfig = await insertTestConfig({
        userId: targetUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
      })
      const bystanderUser = await insertTestUser()
      await insertTestSession(bystanderUser)
      const bystanderConfigLimit = await insertTestConfigLimit({
        userId: bystanderUser.id,
        protocolFamily: ProtocolRegistry.amneziawg3.family,
        maxCount: 3,
      })
      const bystanderConfig = await insertTestConfig({
        userId: bystanderUser.id,
        endpointId: configEndpoint.id,
        deviceTypeId: configDeviceType.id,
      })

      await callDeleteUser(targetUser.id, await signInTestAdmin())

      const userRows = await db.select().from(user).where(eq(user.id, bystanderUser.id))
      expect(userRows).toHaveLength(1)
      const sessionRows = await db
        .select()
        .from(session)
        .where(eq(session.userId, bystanderUser.id))
      expect(sessionRows).toHaveLength(1)
      const configLimitRows = await db
        .select()
        .from(configLimit)
        .where(eq(configLimit.userId, bystanderUser.id))
      expect(configLimitRows).toEqual([bystanderConfigLimit])
      const configRows = await db.select().from(config).where(eq(config.userId, bystanderUser.id))
      expect(configRows).toHaveLength(1)
      expect(configRows[0].id).toBe(bystanderConfig.id)
      expect(configRows[0].status).toBe("active")
      expect(fakeAmneziawg3Client.deleteAccesses).toHaveBeenCalledTimes(1)
      expect(fakeAmneziawg3Client.deleteAccesses).toHaveBeenCalledWith(expect.anything(), [
        targetConfig.data,
      ])
    })
  })

  describe("technical", () => {
    it("rejects with NOT_FOUND when the user row vanishes between lookup and deletion", async () => {
      const targetUser = await insertTestUser()
      vi.mocked(deleteUser).mockResolvedValueOnce([])

      await expectOrpcError(callDeleteUser(targetUser.id, await signInTestAdmin()), "NOT_FOUND")

      const userRows = await db.select().from(user).where(eq(user.id, targetUser.id))
      expect(userRows).toHaveLength(1)
      expect(fakeAmneziawg3Client.deleteAccesses).not.toHaveBeenCalled()
    })

    it("responds with HTTP 500 when the user delete throws", async () => {
      const targetUser = await insertTestUser()
      vi.mocked(deleteUser).mockRejectedValueOnce(new Error("Delete failure"))

      const response = await app.request(`/api/users/${targetUser.id}`, {
        method: "DELETE",
        headers: await signInTestAdmin(),
      })
      expect(response.status).toBe(500)
    })
  })
})
