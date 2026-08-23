import { Amneziawg2ObfuscationLevelOrder } from "../constants/Amneziawg2ObfuscationLevelOrder"
import { Amneziawg2ObfuscationPresets } from "../constants/Amneziawg2ObfuscationPresets"
import type { Amneziawg2ConfigObfuscationLevel } from "../types/Amneziawg2ConfigObfuscationLevel"
import type { Amneziawg2ObfuscationOptions } from "../types/Amneziawg2ObfuscationOptions"

function matchesPreset(
  options: Amneziawg2ObfuscationOptions,
  preset: Amneziawg2ObfuscationOptions,
): boolean {
  return (
    options.protocolProfile === preset.protocolProfile &&
    options.browserFingerprint === preset.browserFingerprint &&
    options.junkPacketCount === preset.junkPacketCount &&
    options.junkPacketSize === preset.junkPacketSize &&
    options.noisePackets === preset.noisePackets
  )
}

export function getAmneziawg2ObfuscationLevel(
  options: Amneziawg2ObfuscationOptions,
): Amneziawg2ConfigObfuscationLevel {
  const matchedLevel = Amneziawg2ObfuscationLevelOrder.find((level) =>
    matchesPreset(options, Amneziawg2ObfuscationPresets[level]),
  )
  return matchedLevel ?? "custom"
}
