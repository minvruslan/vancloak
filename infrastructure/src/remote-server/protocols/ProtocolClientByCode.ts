import type { ProtocolCode } from "../../shared/index.js"
import type { ProtocolClientFactories } from "./ProtocolClientFactories.js"

export type ProtocolClientByCode = {
  [Code in ProtocolCode]: ReturnType<(typeof ProtocolClientFactories)[Code]>
}
