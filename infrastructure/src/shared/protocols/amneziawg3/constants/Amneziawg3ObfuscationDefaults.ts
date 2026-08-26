import { Amneziawg3BrowserFingerprintSchema } from "../types/Amneziawg3BrowserFingerprintSchema"
import { Amneziawg3IntensitySchema } from "../types/Amneziawg3IntensitySchema"
import { Amneziawg3ProtocolProfileSchema } from "../types/Amneziawg3ProtocolProfileSchema"
import type { Amneziawg3ObfuscationOptions } from "../types/Amneziawg3ObfuscationOptions"

export const Amneziawg3ObfuscationDefaults = {
  protocolProfile: Amneziawg3ProtocolProfileSchema.enum.quic_initial,
  browserFingerprint: Amneziawg3BrowserFingerprintSchema.enum.chrome,
  junkPacketCount: Amneziawg3IntensitySchema.enum.medium,
  junkPacketSize: Amneziawg3IntensitySchema.enum.medium,
  noisePackets: null,
} as const satisfies Amneziawg3ObfuscationOptions
