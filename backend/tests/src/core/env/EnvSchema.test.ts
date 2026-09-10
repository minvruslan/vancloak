import { describe, expect, it } from "vitest"
import { EnvSchema } from "@/core/env/EnvSchema.js"

const SSH_PRIVATE_KEY = "-----BEGIN OPENSSH PRIVATE KEY-----\\ndGVzdA==\\n"

function createEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: "postgres://user:pass@localhost:5432/vancloak",
    QUEUE_URL: "redis://localhost:6379",
    BETTER_AUTH_SECRET: "secret",
    BETTER_AUTH_URL: "http://localhost:4000",
    ADMIN_EMAIL: "admin@vancloak.test",
    APP_SSH_PRIVATE_KEY: SSH_PRIVATE_KEY,
    IP: "203.0.113.10",
    COUNTRY: "nl",
    ...overrides,
  }
}

function parseEnv(overrides: Record<string, string | undefined> = {}) {
  return EnvSchema.safeParse(createEnv(overrides))
}

describe("EnvSchema", () => {
  it("accepts a complete valid environment", () => {
    expect(parseEnv().success).toBe(true)
  })

  it("applies the defaults for PORT, HOST and ADMIN_NAME", () => {
    const parsed = parseEnv()

    expect(parsed.success).toBe(true)
    expect(parsed.data?.PORT).toBe(4000)
    expect(parsed.data?.HOST).toBe("localhost")
    expect(parsed.data?.ADMIN_NAME).toBe("Admin")
  })

  it("rejects an empty HOST instead of applying the default", () => {
    expect(parseEnv({ HOST: "" }).success).toBe(false)
  })

  it("rejects an empty ADMIN_NAME instead of applying the default", () => {
    expect(parseEnv({ ADMIN_NAME: "" }).success).toBe(false)
  })

  it("defaults LOG_LEVEL to info", () => {
    expect(parseEnv().data?.LOG_LEVEL).toBe("info")
  })

  it("accepts every pino level as LOG_LEVEL", () => {
    for (const level of ["fatal", "error", "warn", "info", "debug", "trace", "silent"]) {
      expect(parseEnv({ LOG_LEVEL: level }).data?.LOG_LEVEL).toBe(level)
    }
  })

  it("rejects a LOG_LEVEL outside the pino level set", () => {
    expect(parseEnv({ LOG_LEVEL: "verbose" }).success).toBe(false)
    expect(parseEnv({ LOG_LEVEL: "info " }).success).toBe(false)
  })

  it("coerces PORT to a number", () => {
    expect(parseEnv({ PORT: "8080" }).data?.PORT).toBe(8080)
  })

  it("rejects a non-positive PORT", () => {
    expect(parseEnv({ PORT: "0" }).success).toBe(false)
    expect(parseEnv({ PORT: "-1" }).success).toBe(false)
  })

  it("rejects a non-integer PORT", () => {
    expect(parseEnv({ PORT: "80.5" }).success).toBe(false)
  })

  it("uppercases COUNTRY", () => {
    expect(parseEnv({ COUNTRY: "nl" }).data?.COUNTRY).toBe("NL")
  })

  it("rejects a country code that is not two letters", () => {
    expect(parseEnv({ COUNTRY: "NLD" }).success).toBe(false)
  })

  it("rejects a malformed IP", () => {
    expect(parseEnv({ IP: "999.999.999.999" }).success).toBe(false)
  })

  it("rejects an ipv6 IP", () => {
    expect(parseEnv({ IP: "2001:db8::1" }).success).toBe(false)
  })

  it("rejects a malformed ADMIN_EMAIL", () => {
    expect(parseEnv({ ADMIN_EMAIL: "not-an-email" }).success).toBe(false)
  })

  it("rejects a DATABASE_URL that is not a url", () => {
    const parsed = parseEnv({ DATABASE_URL: "not a url" })

    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.error)).toContain("Must be a valid URL")
  })

  it("rejects an empty DATABASE_URL", () => {
    expect(parseEnv({ DATABASE_URL: "" }).success).toBe(false)
  })

  it("rejects a QUEUE_URL that is not a url", () => {
    expect(parseEnv({ QUEUE_URL: "not a url" }).success).toBe(false)
  })

  it("rejects a BETTER_AUTH_URL that is not a url", () => {
    expect(parseEnv({ BETTER_AUTH_URL: "not a url" }).success).toBe(false)
  })

  it("rejects an empty BETTER_AUTH_SECRET", () => {
    expect(parseEnv({ BETTER_AUTH_SECRET: "" }).success).toBe(false)
  })

  it("unescapes the newlines of APP_SSH_PRIVATE_KEY", () => {
    const parsed = parseEnv()

    expect(parsed.data?.APP_SSH_PRIVATE_KEY).toContain("\n")
    expect(parsed.data?.APP_SSH_PRIVATE_KEY).not.toContain("\\n")
  })

  it("appends a trailing newline to APP_SSH_PRIVATE_KEY", () => {
    const parsed = parseEnv({
      APP_SSH_PRIVATE_KEY: "-----BEGIN OPENSSH PRIVATE KEY-----\\ndGVzdA==",
    })

    expect(parsed.data?.APP_SSH_PRIVATE_KEY.endsWith("\n")).toBe(true)
  })

  it("keeps a single trailing newline on an APP_SSH_PRIVATE_KEY that already ends with one", () => {
    const parsed = parseEnv({ APP_SSH_PRIVATE_KEY: SSH_PRIVATE_KEY })

    expect(parsed.data?.APP_SSH_PRIVATE_KEY.endsWith("\n")).toBe(true)
    expect(parsed.data?.APP_SSH_PRIVATE_KEY.endsWith("\n\n")).toBe(false)
  })

  it("rejects an APP_SSH_PRIVATE_KEY without the OpenSSH header", () => {
    expect(parseEnv({ APP_SSH_PRIVATE_KEY: "not-a-key" }).success).toBe(false)
  })

  it("accepts an authorized_keys line as OPERATOR_SSH_PUBLIC_KEY", () => {
    const parsed = parseEnv({ OPERATOR_SSH_PUBLIC_KEY: "ssh-ed25519 AAAAKEY operator@vancloak" })

    expect(parsed.success).toBe(true)
  })

  it("rejects a malformed OPERATOR_SSH_PUBLIC_KEY", () => {
    expect(parseEnv({ OPERATOR_SSH_PUBLIC_KEY: "ssh-ed25519" }).success).toBe(false)
  })

  it("treats an empty OPERATOR_SSH_PUBLIC_KEY as unset", () => {
    const parsed = parseEnv({ OPERATOR_SSH_PUBLIC_KEY: "" })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.OPERATOR_SSH_PUBLIC_KEY).toBeUndefined()
  })

  it("treats an empty DOMAIN_NAME as unset", () => {
    const parsed = parseEnv({ DOMAIN_NAME: "" })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.DOMAIN_NAME).toBeUndefined()
  })

  it("accepts a valid DOMAIN_NAME", () => {
    expect(parseEnv({ DOMAIN_NAME: "node.vancloak.test" }).data?.DOMAIN_NAME).toBe(
      "node.vancloak.test",
    )
  })

  it("rejects a malformed DOMAIN_NAME", () => {
    expect(parseEnv({ DOMAIN_NAME: "not a domain" }).success).toBe(false)
  })

  it("accepts SMTP_URL together with MAIL_FROM", () => {
    const parsed = parseEnv({
      SMTP_URL: "smtp://user:pass@mail.vancloak.test:587",
      MAIL_FROM: "VanCloak <no-reply@vancloak.test>",
    })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.SMTP_URL).toBe("smtp://user:pass@mail.vancloak.test:587")
  })

  it("rejects SMTP_URL without MAIL_FROM", () => {
    expect(parseEnv({ SMTP_URL: "smtp://mail.vancloak.test:587" }).success).toBe(false)
  })

  it("treats empty SMTP_URL and MAIL_FROM as unset", () => {
    const parsed = parseEnv({ SMTP_URL: "", MAIL_FROM: "" })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.SMTP_URL).toBeUndefined()
    expect(parsed.data?.MAIL_FROM).toBeUndefined()
  })

  it("accepts an smtps:// SMTP_URL", () => {
    const parsed = parseEnv({
      SMTP_URL: "smtps://mail.vancloak.test:465",
      MAIL_FROM: "VanCloak <no-reply@vancloak.test>",
    })

    expect(parsed.success).toBe(true)
  })

  it("rejects an SMTP_URL with a non-smtp protocol", () => {
    expect(
      parseEnv({
        SMTP_URL: "https://mail.vancloak.test:587",
        MAIL_FROM: "VanCloak <no-reply@vancloak.test>",
      }).success,
    ).toBe(false)
  })

  it("rejects a production environment without SMTP_URL", () => {
    expect(parseEnv({ NODE_ENV: "production" }).success).toBe(false)
  })

  it("accepts a production environment with SMTP_URL and MAIL_FROM", () => {
    const parsed = parseEnv({
      NODE_ENV: "production",
      SMTP_URL: "smtp://mail.vancloak.test:587",
      MAIL_FROM: "VanCloak <no-reply@vancloak.test>",
    })

    expect(parsed.success).toBe(true)
  })

  it("defaults NODE_ENV to development", () => {
    expect(parseEnv().data?.NODE_ENV).toBe("development")
  })

  it("rejects an environment missing a required variable", () => {
    expect(EnvSchema.safeParse({}).success).toBe(false)
  })
})
