import type { ProtocolCode } from "../../shared/index.js"
import type { ProtocolClientByCode } from "./ProtocolClientByCode.js"

export type ProtocolClient = ProtocolClientByCode[ProtocolCode]
