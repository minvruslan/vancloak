import {
  IpSchema,
  type Amneziawg3ConfigData,
  type ConfigData,
  Amneziawg3KeySchema,
  ProtocolCodeSchema,
} from "../../../../shared/index.js"
import type { Amneziawg3Access } from "../types/index.js"

export function createAccessesFromConfigDatas(
  configDatas: (ConfigData | null)[],
): Amneziawg3Access[] {
  return configDatas
    .filter(
      (configData): configData is Amneziawg3ConfigData =>
        configData?.protocolCode === ProtocolCodeSchema.enum.amneziawg3,
    )
    .filter(
      (configData) => configData.publicKey !== undefined && configData.presharedKey !== undefined,
    )
    .map((configData) => ({
      publicKey: Amneziawg3KeySchema.parse(configData.publicKey),
      presharedKey: Amneziawg3KeySchema.parse(configData.presharedKey),
      clientIp: IpSchema.parse(configData.clientIp),
    }))
}
