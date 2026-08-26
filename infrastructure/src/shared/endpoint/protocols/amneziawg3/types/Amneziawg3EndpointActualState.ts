import type { z } from "zod"
import type { Amneziawg3EndpointActualStateSchema } from "./Amneziawg3EndpointActualStateSchema"

export type Amneziawg3EndpointActualState = z.infer<typeof Amneziawg3EndpointActualStateSchema>
