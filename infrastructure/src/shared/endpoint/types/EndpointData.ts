import type { z } from "zod"
import type { EndpointDataSchema } from "./EndpointDataSchema"

export type EndpointData = z.infer<typeof EndpointDataSchema>
