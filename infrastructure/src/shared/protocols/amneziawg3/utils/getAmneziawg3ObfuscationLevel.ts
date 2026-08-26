import { Amneziawg3ObfuscationLevelOrder } from "../constants/Amneziawg3ObfuscationLevelOrder"
import { Amneziawg3ObfuscationPresets } from "../constants/Amneziawg3ObfuscationPresets"
import type { Amneziawg3ConfigObfuscationLevel } from "../types/Amneziawg3ConfigObfuscationLevel"
import type { Amneziawg3ObfuscationOptions } from "../types/Amneziawg3ObfuscationOptions"

function matchesPreset(
  options: Amneziawg3ObfuscationOptions,
  preset: Amneziawg3ObfuscationOptions,
): boolean {
  return (
    options.protocolProfile === preset.protocolProfile &&
    options.browserFingerprint === preset.browserFingerprint &&
    options.junkPacketCount === preset.junkPacketCount &&
    options.junkPacketSize === preset.junkPacketSize &&
    options.noisePackets === preset.noisePackets
  )
}

export function getAmneziawg3ObfuscationLevel(
  options: Amneziawg3ObfuscationOptions,
): Amneziawg3ConfigObfuscationLevel {
  const matchedLevel = Amneziawg3ObfuscationLevelOrder.find((level) =>
    matchesPreset(options, Amneziawg3ObfuscationPresets[level]),
  )
  return matchedLevel ?? "custom"
}
