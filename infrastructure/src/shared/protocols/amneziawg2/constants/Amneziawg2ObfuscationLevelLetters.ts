import type { Amneziawg2ConfigObfuscationLevel } from "../types/Amneziawg2ConfigObfuscationLevel"

export const Amneziawg2ObfuscationLevelLetters = {
  medium: "B",
  high: "S",
  custom: "C",
} as const satisfies Record<Amneziawg2ConfigObfuscationLevel, string>
