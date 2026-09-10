import { createDecipheriv } from "node:crypto"
import { sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

const AUTH_TAG_LENGTH = 16
const CIPHERTEXT_PREFIX = "v1:"

const ENCRYPTED_COLUMNS = [
  { table: "server", column: "ip" },
  { table: "server", column: "data" },
  { table: "endpoint", column: "data" },
  { table: "config", column: "data" },
]

function readEncryptionKey(): Buffer {
  const decoded = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? "", "base64")

  if (decoded.length !== 32) {
    throw new Error(
      "Encrypted values are still present, so APP_ENCRYPTION_KEY must be 32 bytes encoded as base64",
    )
  }

  return decoded
}

function decryptString(ciphertext: string, key: Buffer): string {
  const parts = ciphertext.split(":")

  const [version, initializationVectorEncoded, payloadEncoded] = parts

  if (parts.length !== 3 || version !== "v1" || !initializationVectorEncoded || !payloadEncoded) {
    throw new Error("Unsupported ciphertext format")
  }

  const initializationVector = Buffer.from(initializationVectorEncoded, "base64")
  const payload = Buffer.from(payloadEncoded, "base64")

  if (payload.length < AUTH_TAG_LENGTH) {
    throw new Error("Ciphertext payload is shorter than the auth tag")
  }

  const decipher = createDecipheriv("aes-256-gcm", key, initializationVector)
  decipher.setAuthTag(payload.subarray(payload.length - AUTH_TAG_LENGTH))

  return Buffer.concat([
    decipher.update(payload.subarray(0, payload.length - AUTH_TAG_LENGTH)),
    decipher.final(),
  ]).toString("utf8")
}

export async function decryptColumns(database: PostgresJsDatabase): Promise<number> {
  return database.transaction(async (transaction) => {
    let decryptedCount = 0
    let key: Buffer | undefined

    for (const { table, column } of ENCRYPTED_COLUMNS) {
      const columnTypes = await transaction.execute<{ dataType: string }>(
        sql`select data_type as "dataType" from information_schema.columns where table_schema = 'public' and table_name = ${table} and column_name = ${column}`,
      )
      if (columnTypes[0]?.dataType !== "text") continue

      const rows = await transaction.execute<{ id: string; value: string }>(
        sql`select "id", ${sql.identifier(column)} as "value" from ${sql.identifier(table)} where ${sql.identifier(column)} like ${`${CIPHERTEXT_PREFIX}%`}`,
      )

      for (const row of rows) {
        key ??= readEncryptionKey()
        const plaintext = decryptString(row.value, key)
        await transaction.execute(
          sql`update ${sql.identifier(table)} set ${sql.identifier(column)} = ${plaintext} where "id" = ${row.id}`,
        )
        decryptedCount += 1
      }
    }

    return decryptedCount
  })
}
