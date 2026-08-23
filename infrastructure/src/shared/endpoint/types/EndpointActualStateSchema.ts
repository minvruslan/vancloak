import { z } from "zod"
import { EndpointDesiredStateSchema } from "./EndpointDesiredStateSchema"

export const EndpointActualStateSchema = EndpointDesiredStateSchema.extend({
  appliedAt: z.iso.datetime(),
})
