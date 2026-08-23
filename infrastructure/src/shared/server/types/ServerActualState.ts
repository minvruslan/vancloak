import type { z } from "zod"
import type { ServerActualStateSchema } from "./ServerActualStateSchema"

export type ServerActualState = z.infer<typeof ServerActualStateSchema>
