import { z } from "zod"
import { ProtocolRegistry } from "../../protocols/constants/ProtocolRegistry"
import type { ProtocolCode } from "../../protocols/types/ProtocolCode"

type ConfigOptionsSchemas = {
  [Code in ProtocolCode]: (typeof ProtocolRegistry)[Code]["configOptionsSchema"]
}[ProtocolCode]

export const ConfigProtocolOptionsSchema = z.discriminatedUnion(
  "protocolCode",
  Object.values(ProtocolRegistry).map((record) => record.configOptionsSchema) as [
    ConfigOptionsSchemas,
    ...ConfigOptionsSchemas[],
  ],
)
