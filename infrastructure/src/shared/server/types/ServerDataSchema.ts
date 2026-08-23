import { z } from "zod"
import { ServerActualStateSchema } from "./ServerActualStateSchema"
import { ServerFactsSchema } from "./ServerFactsSchema"

export const ServerDataSchema = z.looseObject({
  desiredState: z.unknown().optional(),
  actualState: ServerActualStateSchema,
  facts: ServerFactsSchema.optional(),
})
