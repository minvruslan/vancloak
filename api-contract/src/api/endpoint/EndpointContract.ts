import { oc, userAccess } from "../orpc"
import { z } from "zod"
import { EndpointSchema } from "./EndpointSchema"

export const EndpointContract = oc.prefix("/endpoints").router({
  getEndpoints: userAccess
    .route({ method: "GET", path: "/" })
    .output(z.array(EndpointSchema.extend({ isRecommended: z.boolean() }))),
})
