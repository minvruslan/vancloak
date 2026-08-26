import { z } from "zod"
import { Amneziawg3EndpointDesiredStateSchema } from "./Amneziawg3EndpointDesiredStateSchema"

export const Amneziawg3EndpointActualStateSchema = Amneziawg3EndpointDesiredStateSchema.extend({
  appliedAt: z.iso.datetime(),
})
