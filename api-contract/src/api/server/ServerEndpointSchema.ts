import { z } from "zod"
import { PortSchema } from "@vancloak/infrastructure/shared"
import { ProtocolSchema } from "../protocol/ProtocolSchema"
import { EndpointStatusSchema } from "../endpoint/EndpointStatusSchema"

export const ServerEndpointSchema = z.object({
  id: z.uuid(),
  port: PortSchema,
  status: EndpointStatusSchema,
  protocol: ProtocolSchema,
})
