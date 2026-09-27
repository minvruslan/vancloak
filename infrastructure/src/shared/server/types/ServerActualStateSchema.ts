import { z } from "zod"
import { DomainNameSchema } from "../../common/network/types/DomainNameSchema"
import { ServerDesiredStateSchema } from "./ServerDesiredStateSchema"
import { ServerSshSchema } from "./ServerSshSchema"

export const ServerActualStateSchema = ServerDesiredStateSchema.partial().extend({
  ssh: ServerSshSchema,
  appliedAt: z.iso.datetime(),
  decoyWebsite: z
    .object({
      domainName: DomainNameSchema,
      caddyDockerImageVersion: z.string().min(1),
      nodeDockerImageVersion: z.string().min(1),
    })
    .optional(),
})
