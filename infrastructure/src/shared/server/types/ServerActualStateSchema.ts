import { z } from "zod"
import { ServerDesiredStateSchema } from "./ServerDesiredStateSchema"
import { ServerSshSchema } from "./ServerSshSchema"

export const ServerActualStateSchema = ServerDesiredStateSchema.partial().extend({
  ssh: ServerSshSchema,
  appliedAt: z.iso.datetime(),
})
