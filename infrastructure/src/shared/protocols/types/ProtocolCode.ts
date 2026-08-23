import type { z } from "zod"
import type { ProtocolCodeSchema } from "./ProtocolCodeSchema"

export type ProtocolCode = z.infer<typeof ProtocolCodeSchema>
