import type { z } from "zod"
import type { ServerDataSchema } from "./ServerDataSchema"

export type ServerData = z.infer<typeof ServerDataSchema>
