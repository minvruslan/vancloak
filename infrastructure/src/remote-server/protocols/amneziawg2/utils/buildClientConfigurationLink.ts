import { deflateSync } from "node:zlib"
import type {
  Amneziawg2ClientObfuscation,
  Amneziawg2ServerObfuscation,
} from "../../../../shared/index.js"
import { ALLOWED_IPS, PERSISTENT_KEEPALIVE_SECONDS } from "../constants/index.js"

const AMNEZIA_CONTAINER_CODE = "amnezia-awg"
const AMNEZIA_TRANSPORT_PROTOCOL = "udp"
const QCOMPRESS_COMPRESSION_LEVEL = 8
const QCOMPRESS_HEADER_BYTES = 4

export function buildClientConfigurationLink(params: {
  displayName: string
  clientConfiguration: string
  clientPrivateKey: string
  clientIp: string
  serverPublicKey: string
  presharedKey: string
  host: string
  port: number
  dns: string
  mtu: number
  serverObfuscation: Amneziawg2ServerObfuscation
  clientObfuscation: Amneziawg2ClientObfuscation
}): string {
  const {
    displayName,
    clientConfiguration,
    clientPrivateKey,
    clientIp,
    serverPublicKey,
    presharedKey,
    host,
    port,
    dns,
    mtu,
    serverObfuscation,
    clientObfuscation,
  } = params

  const [firstDns, secondDns] = dns.split(",").map((entry) => entry.trim())

  const lastConfig = {
    config: clientConfiguration,
    hostName: host,
    port,
    client_priv_key: clientPrivateKey,
    client_ip: `${clientIp}/32`,
    psk_key: presharedKey,
    server_pub_key: serverPublicKey,
    mtu: String(mtu),
    persistent_keep_alive: String(PERSISTENT_KEEPALIVE_SECONDS),
    allowed_ips: ALLOWED_IPS,
    Jc: String(clientObfuscation.jc),
    Jmin: String(clientObfuscation.jmin),
    Jmax: String(clientObfuscation.jmax),
    S1: String(serverObfuscation.s1),
    S2: String(serverObfuscation.s2),
    S3: String(serverObfuscation.s3),
    S4: String(serverObfuscation.s4),
    H1: String(serverObfuscation.h1),
    H2: String(serverObfuscation.h2),
    H3: String(serverObfuscation.h3),
    H4: String(serverObfuscation.h4),
    ...Object.fromEntries(
      (["i1", "i2", "i3", "i4", "i5"] as const)
        .filter((key) => clientObfuscation[key])
        .map((key) => [key.toUpperCase(), clientObfuscation[key]]),
    ),
  }

  const configImport = {
    containers: [
      {
        container: AMNEZIA_CONTAINER_CODE,
        awg: {
          last_config: JSON.stringify(lastConfig),
          isThirdPartyConfig: true,
          port: String(port),
          transport_proto: AMNEZIA_TRANSPORT_PROTOCOL,
        },
      },
    ],
    defaultContainer: AMNEZIA_CONTAINER_CODE,
    description: displayName,
    ...(firstDns && { dns1: firstDns }),
    ...(secondDns && { dns2: secondDns }),
    hostName: host,
  }

  const json = Buffer.from(JSON.stringify(configImport))
  const header = Buffer.alloc(QCOMPRESS_HEADER_BYTES)
  header.writeUInt32BE(json.length, 0)
  const compressed = Buffer.concat([
    header,
    deflateSync(json, { level: QCOMPRESS_COMPRESSION_LEVEL }),
  ])

  return `vpn://${compressed.toString("base64url")}`
}
