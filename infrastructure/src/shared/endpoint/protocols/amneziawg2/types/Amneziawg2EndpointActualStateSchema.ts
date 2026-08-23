import { z } from "zod"
import { Amneziawg2EndpointDesiredStateSchema } from "./Amneziawg2EndpointDesiredStateSchema"

export const Amneziawg2EndpointActualStateSchema = Amneziawg2EndpointDesiredStateSchema.extend({
  appliedAt: z.iso.datetime(),
})
