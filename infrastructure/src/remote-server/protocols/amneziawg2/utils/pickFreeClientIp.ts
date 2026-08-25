import type { Amneziawg2ClientIdentifier, IpSubnet } from "../../../../shared/index.js"
import {
  Amneziawg2ClientIdentifierSchema,
  convertIpToNumber,
  convertNumberToIp,
  parseIpSubnet,
} from "../../../../shared/index.js"
import { ServerAddressOffset } from "../constants/index.js"

const FIRST_CLIENT_ADDRESS_OFFSET = ServerAddressOffset + 1

export function pickFreeClientIp(
  usedIps: (string | null)[],
  subnet: IpSubnet,
): Amneziawg2ClientIdentifier | null {
  const { networkNumber, broadcastNumber } = parseIpSubnet(subnet)
  const used = new Set<number>()

  for (const ip of usedIps) {
    if (ip) used.add(convertIpToNumber(ip))
  }

  for (
    let address = networkNumber + FIRST_CLIENT_ADDRESS_OFFSET;
    address < broadcastNumber;
    address++
  ) {
    if (!used.has(address)) {
      return Amneziawg2ClientIdentifierSchema.parse(convertNumberToIp(address))
    }
  }

  return null
}
