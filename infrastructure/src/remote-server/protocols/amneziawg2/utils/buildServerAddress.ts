import { convertNumberToIp, parseIpSubnet, type IpSubnet } from "../../../../shared/index.js"
import { SERVER_ADDRESS_OFFSET } from "../constants/index.js"

export function buildServerAddress(subnet: IpSubnet): string {
  const { networkNumber, prefixLength } = parseIpSubnet(subnet)
  return `${convertNumberToIp(networkNumber + SERVER_ADDRESS_OFFSET)}/${prefixLength}`
}
