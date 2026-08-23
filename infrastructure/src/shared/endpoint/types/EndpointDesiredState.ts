import type { z } from "zod"
import type { EndpointDesiredStateSchema } from "./EndpointDesiredStateSchema"

export type EndpointDesiredState = z.infer<typeof EndpointDesiredStateSchema>
