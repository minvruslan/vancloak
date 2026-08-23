import { z } from "zod"
import { Amneziawg2BrowserFingerprintSchema } from "./Amneziawg2BrowserFingerprintSchema"
import { Amneziawg2IntensitySchema } from "./Amneziawg2IntensitySchema"
import { Amneziawg2ProtocolProfileSchema } from "./Amneziawg2ProtocolProfileSchema"

export const Amneziawg2ObfuscationOptionsSchema = z.object({
  protocolProfile: Amneziawg2ProtocolProfileSchema,
  browserFingerprint: Amneziawg2BrowserFingerprintSchema.nullable(),
  junkPacketCount: Amneziawg2IntensitySchema,
  junkPacketSize: Amneziawg2IntensitySchema,
  noisePackets: Amneziawg2IntensitySchema.nullable(),
})
