import { z } from "zod"
import { Amneziawg3BrowserFingerprintSchema } from "./Amneziawg3BrowserFingerprintSchema"
import { Amneziawg3IntensitySchema } from "./Amneziawg3IntensitySchema"
import { Amneziawg3ProtocolProfileSchema } from "./Amneziawg3ProtocolProfileSchema"

export const Amneziawg3ObfuscationOptionsSchema = z.object({
  protocolProfile: Amneziawg3ProtocolProfileSchema,
  browserFingerprint: Amneziawg3BrowserFingerprintSchema.nullable(),
  junkPacketCount: Amneziawg3IntensitySchema,
  junkPacketSize: Amneziawg3IntensitySchema,
  noisePackets: Amneziawg3IntensitySchema.nullable(),
})
