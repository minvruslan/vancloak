import type { z } from "zod"
import type { Amneziawg2EndpointDesiredStateSchema } from "./Amneziawg2EndpointDesiredStateSchema"

export type Amneziawg2EndpointDesiredState = z.infer<typeof Amneziawg2EndpointDesiredStateSchema>
