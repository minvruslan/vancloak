import type { LoggerOptions } from "pino"
import { pino } from "pino"
import { afterEach, describe, expect, it, vi } from "vitest"

const SECRET_VALUE = "must-never-reach-the-log"

const SECRET_FIELD_NAMES = [
  "clientConfiguration",
  "privateKey",
  "presharedKey",
  "publicKey",
  "password",
  "serverAccess",
]

async function importLoggerAndReturnPinoOptions() {
  vi.resetModules()
  const pinoMock = vi.fn((options: Record<string, unknown>) => ({ child: vi.fn(), options }))
  vi.doMock("pino", async (importOriginal) => ({
    ...(await importOriginal<typeof import("pino")>()),
    pino: pinoMock,
  }))
  await import("@/core/logger/logger.js")
  return pinoMock.mock.calls[0][0]
}

async function createLoggerAndItsCapturedLines() {
  const { redact, serializers } = (await importLoggerAndReturnPinoOptions()) as LoggerOptions
  const lines: Record<string, unknown>[] = []
  const destination = {
    write(line: string) {
      lines.push(JSON.parse(line))
    },
  }
  return { logger: pino({ redact, serializers }, destination), lines }
}

describe("logger", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock("pino")
    vi.resetModules()
  })

  it("takes its level from LOG_LEVEL", async () => {
    vi.stubEnv("LOG_LEVEL", "warn")

    const pinoOptions = await importLoggerAndReturnPinoOptions()

    expect(pinoOptions.level).toBe("warn")
  })

  it("falls back to the info level when LOG_LEVEL is unset", async () => {
    vi.stubEnv("LOG_LEVEL", undefined)

    const pinoOptions = await importLoggerAndReturnPinoOptions()

    expect(pinoOptions.level).toBe("info")
  })

  it("uses no transport in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("SMTP_URL", "smtp://localhost:587")
    vi.stubEnv("MAIL_FROM", "VanCloak <no-reply@localhost>")

    const pinoOptions = await importLoggerAndReturnPinoOptions()

    expect(pinoOptions.transport).toBeUndefined()
  })

  it("pretty-prints outside production", async () => {
    vi.stubEnv("NODE_ENV", "development")

    const pinoOptions = await importLoggerAndReturnPinoOptions()

    expect(pinoOptions.transport).toEqual({ target: "pino-pretty" })
  })

  it.each(SECRET_FIELD_NAMES)("hides a top-level %s from the log output", async (secretField) => {
    const { logger, lines } = await createLoggerAndItsCapturedLines()

    logger.info({ [secretField]: SECRET_VALUE }, "Message.")

    expect(lines[0][secretField]).toBe("[Redacted]")
    expect(JSON.stringify(lines[0])).not.toContain(SECRET_VALUE)
  })

  it.each(SECRET_FIELD_NAMES)("hides a nested %s from the log output", async (secretField) => {
    const { logger, lines } = await createLoggerAndItsCapturedLines()

    logger.info({ credentials: { [secretField]: SECRET_VALUE } }, "Message.")

    const credentials = lines[0].credentials as Record<string, unknown>
    expect(credentials[secretField]).toBe("[Redacted]")
    expect(JSON.stringify(lines[0])).not.toContain(SECRET_VALUE)
  })

  it.each(SECRET_FIELD_NAMES)(
    "hides a doubly nested %s from the log output",
    async (secretField) => {
      const { logger, lines } = await createLoggerAndItsCapturedLines()

      logger.info({ server: { data: { [secretField]: SECRET_VALUE } } }, "Message.")

      const serverField = lines[0].server as { data: Record<string, unknown> }
      expect(serverField.data[secretField]).toBe("[Redacted]")
      expect(JSON.stringify(lines[0])).not.toContain(SECRET_VALUE)
    },
  )

  it("does not redact a secret deeper than two nesting levels", async () => {
    const { logger, lines } = await createLoggerAndItsCapturedLines()

    logger.info({ request: { server: { data: { password: SECRET_VALUE } } } }, "Message.")

    const dataField = (lines[0].request as { server: { data: Record<string, unknown> } }).server
      .data
    expect(dataField.password).toBe(SECRET_VALUE)
  })

  it("serializes a logged error with its message and stack", async () => {
    const { logger, lines } = await createLoggerAndItsCapturedLines()

    logger.error({ error: new Error("Boom.") }, "Message.")

    const loggedError = lines[0].error as Record<string, unknown>
    expect(loggedError.message).toBe("Boom.")
    expect(String(loggedError.stack)).toContain("Boom.")
  })

  it("leaves non-secret fields untouched", async () => {
    const { logger, lines } = await createLoggerAndItsCapturedLines()

    logger.info({ serverId: "server-1", password: SECRET_VALUE }, "Message.")

    expect(lines[0].serverId).toBe("server-1")
    expect(lines[0].msg).toBe("Message.")
  })
})
