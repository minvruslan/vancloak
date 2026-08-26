import type { z } from "zod"
import type { Amneziawg3EndpointDesiredStateSchema } from "./Amneziawg3EndpointDesiredStateSchema"

export type Amneziawg3EndpointDesiredState = z.infer<typeof Amneziawg3EndpointDesiredStateSchema>
