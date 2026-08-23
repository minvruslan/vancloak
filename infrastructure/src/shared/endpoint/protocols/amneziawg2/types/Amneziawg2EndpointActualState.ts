import type { z } from "zod"
import type { Amneziawg2EndpointActualStateSchema } from "./Amneziawg2EndpointActualStateSchema"

export type Amneziawg2EndpointActualState = z.infer<typeof Amneziawg2EndpointActualStateSchema>
