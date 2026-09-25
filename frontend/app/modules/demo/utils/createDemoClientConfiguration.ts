import { ProtocolCodeSchema, type Amneziawg3Intensity, type Config } from "@vancloak/api-contract"

function createFakeAmneziawg3Key(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
}

const JUNK_PACKET_COUNT_BY_INTENSITY: Record<Amneziawg3Intensity, number> = {
  low: 2,
  medium: 4,
  high: 8,
}

export function createDemoClientConfiguration(config: Config): string {
  if (config.data.protocolCode !== ProtocolCodeSchema.enum.amneziawg3) {
    throw new Error(`Unsupported demo protocol: ${config.data.protocolCode}`)
  }

  const host = `${(config.endpoint.server?.name ?? "vancloak").toLowerCase()}.vancloak.app`

  return [
    "[Interface]",
    `Address = ${config.data.clientIp}/32`,
    "DNS = 1.1.1.1, 1.0.0.1",
    "MTU = 1280",
    `PrivateKey = ${createFakeAmneziawg3Key()}`,
    `Jc = ${JUNK_PACKET_COUNT_BY_INTENSITY[config.data.options.junkPacketCount]}`,
    "Jmin = 40",
    "Jmax = 70",
    "S1 = 116",
    "S2 = 61",
    "S3 = 13",
    "S4 = 41",
    "H1 = 1004746675",
    "H2 = 1373467569",
    "H3 = 419684853",
    "H4 = 1235994835",
    "",
    "[Peer]",
    `PublicKey = ${createFakeAmneziawg3Key()}`,
    `PresharedKey = ${createFakeAmneziawg3Key()}`,
    "AllowedIPs = 0.0.0.0/0, ::/0",
    `Endpoint = ${host}:${config.endpoint.port}`,
    "PersistentKeepalive = 25",
    "",
  ].join("\n")
}
