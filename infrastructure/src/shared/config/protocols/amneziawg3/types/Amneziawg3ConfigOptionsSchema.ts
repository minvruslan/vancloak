import { z } from "zod"
import { ProtocolCodeSchema } from "../../../../protocols/types/ProtocolCodeSchema"
import { Amneziawg3ObfuscationOptionsSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3ObfuscationOptionsSchema"

export const Amneziawg3ConfigOptionsSchema = z.object({
  protocolCode: z.literal(ProtocolCodeSchema.enum.amneziawg3),
  ...Amneziawg3ObfuscationOptionsSchema.partial().shape,
})
