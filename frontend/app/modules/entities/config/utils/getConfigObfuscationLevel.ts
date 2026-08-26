import {
  ProtocolCodeSchema,
  getAmneziawg3ObfuscationLevel,
  type Amneziawg3ConfigObfuscationLevel,
  type ConfigData,
} from "@vancloak/api-contract"

export function getConfigObfuscationLevel(
  data: ConfigData,
): Amneziawg3ConfigObfuscationLevel | null {
  if (data.protocolCode !== ProtocolCodeSchema.enum.amneziawg3) return null
  return getAmneziawg3ObfuscationLevel(data.options)
}
