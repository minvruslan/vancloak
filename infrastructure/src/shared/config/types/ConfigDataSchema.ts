import { z } from "zod"
import { ProtocolRegistry } from "../../protocols/constants/ProtocolRegistry"
import type { ProtocolCode } from "../../protocols/types/ProtocolCode"

type ConfigDataSchemas = {
  [Code in ProtocolCode]: (typeof ProtocolRegistry)[Code]["configDataSchema"]
}[ProtocolCode]

export const ConfigDataSchema = z.discriminatedUnion(
  "protocolCode",
  Object.values(ProtocolRegistry).map((record) => record.configDataSchema) as [
    ConfigDataSchemas,
    ...ConfigDataSchemas[],
  ],
)
