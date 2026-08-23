import type { z } from "zod"
import type { ServerAccessSchema } from "./ServerAccessSchema"

export type ServerAccess = z.infer<typeof ServerAccessSchema>
