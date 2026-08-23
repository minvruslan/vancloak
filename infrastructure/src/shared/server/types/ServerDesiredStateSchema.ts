import { z } from "zod"
import { UnixPathSchema } from "../../common/unix/types/UnixPathSchema"
import { ServerSshSchema } from "./ServerSshSchema"

export const ServerDesiredStateSchema = z.object({
  ssh: ServerSshSchema,
  baseDirectory: UnixPathSchema,
})
