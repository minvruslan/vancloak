import type { z } from "zod"
import type { ConfigProtocolOptionsSchema } from "./ConfigProtocolOptionsSchema"

export type ConfigProtocolOptions = z.infer<typeof ConfigProtocolOptionsSchema>
