import { z } from "zod"
import { ProtocolCodeSchema } from "../../../../protocols/types/ProtocolCodeSchema"
import { Amneziawg2ObfuscationOptionsSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2ObfuscationOptionsSchema"

export const Amneziawg2ConfigOptionsSchema = z.object({
  protocolCode: z.literal(ProtocolCodeSchema.enum.amneziawg2),
  ...Amneziawg2ObfuscationOptionsSchema.partial().shape,
})
