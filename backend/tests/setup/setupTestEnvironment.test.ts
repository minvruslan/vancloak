import { describe, expect, it } from "vitest"
import { env } from "@/core/env/index.js"
import { TestDatabaseUrl } from "@tests/constants/TestDatabaseUrl.js"
import { TestQueueUrl } from "@tests/constants/TestQueueUrl.js"

describe("setupTestEnvironment", () => {
  it("points DATABASE_URL at the test database", () => {
    expect(env.DATABASE_URL).toBe(TestDatabaseUrl)
  })

  it("points QUEUE_URL at the test redis", () => {
    expect(env.QUEUE_URL).toBe(TestQueueUrl)
  })

  it("pins PORT, HOST and ADMIN_NAME against values leaking from a developer's .env", () => {
    expect(env.PORT).toBe(4000)
    expect(env.HOST).toBe("localhost")
    expect(env.ADMIN_NAME).toBe("Test Admin")
  })
})
