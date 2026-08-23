import {
  ProtocolCodeSchema,
  getAmneziawg2ObfuscationLevel,
  type Amneziawg2ConfigObfuscationLevel,
  type ConfigData,
} from "@vancloak/api-contract"

export function getConfigObfuscationLevel(
  data: ConfigData,
): Amneziawg2ConfigObfuscationLevel | null {
  if (data.protocolCode !== ProtocolCodeSchema.enum.amneziawg2) return null
  return getAmneziawg2ObfuscationLevel(data.options)
}
