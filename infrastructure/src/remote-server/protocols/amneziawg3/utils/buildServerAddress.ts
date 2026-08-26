import { convertNumberToIp, parseIpSubnet, type IpSubnet } from "../../../../shared/index.js"
import { ServerAddressOffset } from "../constants/index.js"

export function buildServerAddress(subnet: IpSubnet): string {
  const { networkNumber, prefixLength } = parseIpSubnet(subnet)
  return `${convertNumberToIp(networkNumber + ServerAddressOffset)}/${prefixLength}`
}
