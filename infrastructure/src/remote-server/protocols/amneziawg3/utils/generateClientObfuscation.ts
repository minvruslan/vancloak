import type {
  Amneziawg3ClientObfuscation,
  Amneziawg3Intensity,
  Amneziawg3ObfuscationOptions,
} from "../../../../shared/index.js"
import { genCfg } from "../vendor/awg-architect/engines/awg/generator/index"
import { ObfuscationGeneratorBaseInput } from "../constants/index.js"

export const JUNK_PACKET_COUNT_BY_LEVEL: Record<Amneziawg3Intensity, number> = {
  low: 4,
  medium: 6,
  high: 8,
}

const SIGNATURE_SIZE_WITHOUT_FINGERPRINT: Amneziawg3Intensity = "medium"

export function generateClientObfuscation(
  mtu: number,
  options: Amneziawg3ObfuscationOptions,
): Amneziawg3ClientObfuscation {
  const junkLevel = JUNK_PACKET_COUNT_BY_LEVEL[options.junkPacketCount]
  const base = {
    ...ObfuscationGeneratorBaseInput,
    mtu,
    profile: options.protocolProfile,
    junkLevel,
    useHeaderProtection: false,
    useRandomTimings: false,
  }

  const junk = genCfg({ ...base, intensity: options.junkPacketSize })

  const signature = genCfg({
    ...base,
    intensity: SIGNATURE_SIZE_WITHOUT_FINGERPRINT,
    useBrowserFp: options.browserFingerprint !== null,
    browserProfile: options.browserFingerprint ?? "",
  })

  const noise =
    options.noisePackets === null ? null : genCfg({ ...base, intensity: options.noisePackets })

  return {
    jc: junk.jc,
    jmin: junk.jmin,
    jmax: junk.jmax,
    i1: signature.i1,
    ...(noise && { i2: noise.i2, i3: noise.i3, i4: noise.i4, i5: noise.i5 }),
  }
}
