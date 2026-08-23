import {
  IpSchema,
  type Amneziawg2ConfigData,
  type ConfigData,
  Amneziawg2KeySchema,
  ProtocolCodeSchema,
} from "../../../../shared/index.js"
import type { Amneziawg2Access } from "../types/index.js"

export function createAccessesFromConfigDatas(
  configDatas: (ConfigData | null)[],
): Amneziawg2Access[] {
  return configDatas
    .filter(
      (configData): configData is Amneziawg2ConfigData =>
        configData?.protocolCode === ProtocolCodeSchema.enum.amneziawg2,
    )
    .filter(
      (configData) => configData.publicKey !== undefined && configData.presharedKey !== undefined,
    )
    .map((configData) => ({
      publicKey: Amneziawg2KeySchema.parse(configData.publicKey),
      presharedKey: Amneziawg2KeySchema.parse(configData.presharedKey),
      clientIp: IpSchema.parse(configData.clientIp),
    }))
}
