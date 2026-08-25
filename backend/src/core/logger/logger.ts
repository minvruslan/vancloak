import { env } from "@/core/env/index.js"
import { pino, stdSerializers } from "pino"

const SECRET_FIELD_NAMES = [
  "clientConfiguration",
  "clientConfigurationLink",
  "privateKey",
  "presharedKey",
  "publicKey",
  "password",
  "serverAccess",
]

const REDACTED_PATHS = SECRET_FIELD_NAMES.flatMap((field) => [field, `*.${field}`, `*.*.${field}`])

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: REDACTED_PATHS,
  serializers: { error: stdSerializers.err },
  transport: env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
})

export const apiLogger = logger.child({ module: "api" })
export const authLogger = logger.child({ module: "auth" })
export const bootstrapLogger = logger.child({ module: "bootstrap" })
export const configLogger = logger.child({ module: "config" })
export const serverLogger = logger.child({ module: "server" })
export const startupLogger = logger.child({ module: "startup" })
export const userLogger = logger.child({ module: "user" })
export const workerLogger = logger.child({ module: "worker" })
