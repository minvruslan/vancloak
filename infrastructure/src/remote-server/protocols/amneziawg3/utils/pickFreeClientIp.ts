import type { Amneziawg3ClientIdentifier, IpSubnet } from "../../../../shared/index.js"
import {
  Amneziawg3ClientIdentifierSchema,
  convertIpToNumber,
  convertNumberToIp,
  parseIpSubnet,
} from "../../../../shared/index.js"
import { ServerAddressOffset } from "../constants/index.js"

const FIRST_CLIENT_ADDRESS_OFFSET = ServerAddressOffset + 1

export function pickFreeClientIp(
  usedIps: (string | null)[],
  subnet: IpSubnet,
): Amneziawg3ClientIdentifier | null {
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
      return Amneziawg3ClientIdentifierSchema.parse(convertNumberToIp(address))
    }
  }

  return null
}
