import type { z } from "zod"
import type { EndpointActualStateSchema } from "./EndpointActualStateSchema"

export type EndpointActualState = z.infer<typeof EndpointActualStateSchema>
