import { z } from "zod"

export const ServerFactsSchema = z.looseObject({
  sshHostKeys: z.array(z.string().min(1)).optional(),
})
