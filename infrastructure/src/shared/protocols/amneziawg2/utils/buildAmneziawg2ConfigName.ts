import slugify from "@sindresorhus/slugify"
import { Amneziawg2ObfuscationLevelLetters } from "../constants/Amneziawg2ObfuscationLevelLetters"
import type { Amneziawg2ObfuscationOptions } from "../types/Amneziawg2ObfuscationOptions"
import { getAmneziawg2ObfuscationLevel } from "./getAmneziawg2ObfuscationLevel"

const FALLBACK_NAME = "config"

export function buildAmneziawg2ConfigName(
  serverName: string,
  options: Amneziawg2ObfuscationOptions,
  maximumLength = Number.POSITIVE_INFINITY,
): string {
  const letter = Amneziawg2ObfuscationLevelLetters[getAmneziawg2ObfuscationLevel(options)]
  const suffix = `-${letter.toLowerCase()}`
  const name = slugify(serverName, { decamelize: false })
    .slice(0, maximumLength - suffix.length)
    .replace(/-$/, "")
  return `${name || FALLBACK_NAME}${suffix}`
}
