import type {
  Amneziawg2ClientObfuscation,
  Amneziawg2ServerObfuscation,
} from "../../../../shared/index.js"
import { ALLOWED_IPS, PERSISTENT_KEEPALIVE_SECONDS } from "../constants/index.js"

export function buildClientConfiguration(params: {
  clientPrivateKey: string
  clientIp: string
  serverPublicKey: string
  presharedKey: string
  serverEndpoint: string
  mtu: number
  serverObfuscation: Amneziawg2ServerObfuscation
  clientObfuscation: Amneziawg2ClientObfuscation
  dns: string
}): string {
  const {
    clientPrivateKey,
    clientIp,
    serverPublicKey,
    presharedKey,
    serverEndpoint,
    mtu,
    serverObfuscation,
    clientObfuscation,
    dns,
  } = params

  return [
    "[Interface]",
    `Address = ${clientIp}/32`,
    `DNS = ${dns}`,
    `MTU = ${mtu}`,
    `PrivateKey = ${clientPrivateKey}`,
    `Jc = ${clientObfuscation.jc}`,
    `Jmin = ${clientObfuscation.jmin}`,
    `Jmax = ${clientObfuscation.jmax}`,
    `S1 = ${serverObfuscation.s1}`,
    `S2 = ${serverObfuscation.s2}`,
    `S3 = ${serverObfuscation.s3}`,
    `S4 = ${serverObfuscation.s4}`,
    `H1 = ${serverObfuscation.h1}`,
    `H2 = ${serverObfuscation.h2}`,
    `H3 = ${serverObfuscation.h3}`,
    `H4 = ${serverObfuscation.h4}`,
    ...(["i1", "i2", "i3", "i4", "i5"] as const)
      .filter((key) => clientObfuscation[key])
      .map((key) => `${key.toUpperCase()} = ${clientObfuscation[key]}`),
    "",
    "[Peer]",
    `PublicKey = ${serverPublicKey}`,
    `PresharedKey = ${presharedKey}`,
    `AllowedIPs = ${ALLOWED_IPS.join(", ")}`,
    `Endpoint = ${serverEndpoint}`,
    `PersistentKeepalive = ${PERSISTENT_KEEPALIVE_SECONDS}`,
    "",
  ].join("\n")
}
