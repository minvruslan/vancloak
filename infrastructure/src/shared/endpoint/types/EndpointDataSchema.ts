import { z } from "zod"

export const EndpointDataSchema = z.looseObject({
  desiredState: z.unknown().optional(),
  actualState: z.unknown().optional(),
})
