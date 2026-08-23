import { z } from "zod"
import { PortSchema } from "@vancloak/infrastructure/shared"

export const UpsertServerEndpointSchema = z.object({
  id: z.uuid().optional(),
  protocolId: z.uuid(),
  port: PortSchema.optional(),
})
