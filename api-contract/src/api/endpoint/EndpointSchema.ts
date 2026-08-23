import { z } from "zod"
import { PortSchema } from "@vancloak/infrastructure/shared"
import { ProtocolSchema } from "../protocol/ProtocolSchema"
import { EndpointServerSchema } from "./EndpointServerSchema"

export const EndpointSchema = z.object({
  id: z.uuid(),
  port: PortSchema,
  protocol: ProtocolSchema,
  server: EndpointServerSchema,
})
