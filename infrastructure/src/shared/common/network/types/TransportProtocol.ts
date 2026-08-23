import type { z } from "zod"
import type { TransportProtocolSchema } from "./TransportProtocolSchema"

export type TransportProtocol = z.infer<typeof TransportProtocolSchema>
