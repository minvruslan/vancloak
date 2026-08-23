import type { z } from "zod"
import type { ServerSshSchema } from "./ServerSshSchema"

export type ServerSsh = z.infer<typeof ServerSshSchema>
