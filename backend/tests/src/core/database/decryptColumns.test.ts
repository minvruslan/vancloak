import { createCipheriv, randomBytes } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vitest"
import { decryptColumns } from "@/core/database/decryptColumns.js"
import { db } from "@/core/database/index.js"
import { endpoint, server } from "@/core/database/schemas/index.js"
import { insertTestEndpoint, insertTestProtocol, insertTestServer } from "@tests/helpers/index.js"

const ENCRYPTION_KEY = Buffer.alloc(32, "decrypt-columns")
const INITIALIZATION_VECTOR_LENGTH = 12

function encryptString(plaintext: string): string {
  const initializationVector = randomBytes(INITIALIZATION_VECTOR_LENGTH)
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, initializationVector)

  const payload = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ])

  return `v1:${initializationVector.toString("base64")}:${payload.toString("base64")}`
}

function stubEncryptionKey() {
  vi.stubEnv("APP_ENCRYPTION_KEY", ENCRYPTION_KEY.toString("base64"))
}

async function withTextEndpointData(run: () => Promise<void>) {
  await db.execute(sql`alter table endpoint alter column data set data type text`)
  try {
    await run()
  } finally {
    await db.execute(
      sql`alter table endpoint alter column data set data type jsonb using data::jsonb`,
    )
  }
}

describe("decryptColumns", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("rewrites encrypted values as plaintext and reports how many it rewrote", async () => {
    const testServer = await insertTestServer({ ip: "198.51.100.4" })
    stubEncryptionKey()
    await db
      .update(server)
      .set({ ip: encryptString("198.51.100.4") })
      .where(eq(server.id, testServer.id))

    const decryptedCount = await decryptColumns(db)

    expect(decryptedCount).toBe(1)
    const [decryptedServer] = await db.select().from(server).where(eq(server.id, testServer.id))
    expect(decryptedServer.ip).toBe("198.51.100.4")
  })

  it("rewrites an encrypted jsonb column so that it can be cast to jsonb afterwards", async () => {
    const testServer = await insertTestServer()
    const testProtocol = await insertTestProtocol()
    const testEndpoint = await insertTestEndpoint({
      serverId: testServer.id,
      protocolId: testProtocol.id,
    })
    stubEncryptionKey()

    await withTextEndpointData(async () => {
      await db.execute(
        sql`update endpoint set data = ${encryptString(JSON.stringify(testEndpoint.data))} where id = ${testEndpoint.id}::uuid`,
      )

      const decryptedCount = await decryptColumns(db)

      expect(decryptedCount).toBe(1)
    })

    const [decryptedEndpoint] = await db
      .select()
      .from(endpoint)
      .where(eq(endpoint.id, testEndpoint.id))
    expect(decryptedEndpoint.data).toEqual(testEndpoint.data)
  })

  it("leaves plaintext values untouched and reports nothing on a second run", async () => {
    const testServer = await insertTestServer({ ip: "198.51.100.5" })
    stubEncryptionKey()
    await db
      .update(server)
      .set({ ip: encryptString("198.51.100.5") })
      .where(eq(server.id, testServer.id))
    await decryptColumns(db)

    const decryptedCount = await decryptColumns(db)

    expect(decryptedCount).toBe(0)
    const [decryptedServer] = await db.select().from(server).where(eq(server.id, testServer.id))
    expect(decryptedServer.ip).toBe("198.51.100.5")
  })

  it("throws when an encrypted value is present and the encryption key is missing", async () => {
    const testServer = await insertTestServer({ ip: "198.51.100.7" })
    stubEncryptionKey()
    await db
      .update(server)
      .set({ ip: encryptString("198.51.100.7") })
      .where(eq(server.id, testServer.id))
    vi.stubEnv("APP_ENCRYPTION_KEY", undefined)

    await expect(decryptColumns(db)).rejects.toThrow("APP_ENCRYPTION_KEY")
  })
})
