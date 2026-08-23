import { Amneziawg2BrowserFingerprintSchema } from "../types/Amneziawg2BrowserFingerprintSchema"
import { Amneziawg2IntensitySchema } from "../types/Amneziawg2IntensitySchema"
import { Amneziawg2ProtocolProfileSchema } from "../types/Amneziawg2ProtocolProfileSchema"
import type { Amneziawg2ObfuscationLevel } from "../types/Amneziawg2ObfuscationLevel"
import type { Amneziawg2ObfuscationOptions } from "../types/Amneziawg2ObfuscationOptions"

export const Amneziawg2ObfuscationPresets: Record<
  Amneziawg2ObfuscationLevel,
  Amneziawg2ObfuscationOptions
> = {
  medium: {
    protocolProfile: Amneziawg2ProtocolProfileSchema.enum.quic_initial,
    browserFingerprint: Amneziawg2BrowserFingerprintSchema.enum.chrome,
    junkPacketCount: Amneziawg2IntensitySchema.enum.medium,
    junkPacketSize: Amneziawg2IntensitySchema.enum.medium,
    noisePackets: null,
  },
  high: {
    protocolProfile: Amneziawg2ProtocolProfileSchema.enum.quic_initial,
    browserFingerprint: Amneziawg2BrowserFingerprintSchema.enum.chrome,
    junkPacketCount: Amneziawg2IntensitySchema.enum.high,
    junkPacketSize: Amneziawg2IntensitySchema.enum.high,
    noisePackets: Amneziawg2IntensitySchema.enum.medium,
  },
}
