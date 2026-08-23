import type { Amneziawg2ClientIdentifier } from "../../../../shared/index.js"
import { Amneziawg2ClientIdentifierSchema } from "../../../../shared/index.js"

const FIRST_CLIENT_OCTET = 2
const LAST_CLIENT_OCTET = 254

export function pickFreeClientIp(
  usedIps: (string | null)[],
  subnetPrefix: string,
): Amneziawg2ClientIdentifier | null {
  const used = new Set<number>()

  for (const ip of usedIps) {
    const octet = ip ? Number(ip.split(".")[3]) : NaN
    if (!Number.isNaN(octet)) used.add(octet)
  }

  for (let octet = FIRST_CLIENT_OCTET; octet <= LAST_CLIENT_OCTET; octet++) {
    if (!used.has(octet)) return Amneziawg2ClientIdentifierSchema.parse(`${subnetPrefix}.${octet}`)
  }

  return null
}
