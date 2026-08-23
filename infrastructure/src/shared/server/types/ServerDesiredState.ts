import type { z } from "zod"
import type { ServerDesiredStateSchema } from "./ServerDesiredStateSchema"

export type ServerDesiredState = z.infer<typeof ServerDesiredStateSchema>
