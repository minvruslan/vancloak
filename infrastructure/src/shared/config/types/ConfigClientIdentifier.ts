import type { z } from "zod"
import type { ProtocolRegistry } from "../../protocols/constants/ProtocolRegistry"
import type { ProtocolCode } from "../../protocols/types/ProtocolCode"

export type ConfigClientIdentifier = {
  [Code in ProtocolCode]: z.infer<(typeof ProtocolRegistry)[Code]["clientIdentifierSchema"]>
}[ProtocolCode]
