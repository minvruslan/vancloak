import { z } from "zod"

const MAXIMUM_JUNK_PACKET_COUNT = 128
const MAXIMUM_JUNK_PACKET_SIZE = 1280

const JunkPacketSizeSchema = z.number().int().min(0).max(MAXIMUM_JUNK_PACKET_SIZE)
const SignaturePacketSchema = z.string().min(1)

export const Amneziawg2ClientObfuscationSchema = z.object({
  jc: z.number().int().min(1).max(MAXIMUM_JUNK_PACKET_COUNT),
  jmin: JunkPacketSizeSchema,
  jmax: JunkPacketSizeSchema,
  i1: SignaturePacketSchema,
  i2: SignaturePacketSchema.optional(),
  i3: SignaturePacketSchema.optional(),
  i4: SignaturePacketSchema.optional(),
  i5: SignaturePacketSchema.optional(),
})
