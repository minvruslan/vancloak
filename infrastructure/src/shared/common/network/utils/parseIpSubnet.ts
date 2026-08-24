import { convertIpToNumber } from "./convertIpToNumber"

const ADDRESS_BIT_COUNT = 32

export function parseIpSubnet(subnet: string): {
  networkNumber: number
  broadcastNumber: number
  prefixLength: number
  hostCount: number
} {
  const separatorIndex = subnet.indexOf("/")
  const networkNumber = convertIpToNumber(subnet.slice(0, separatorIndex))
  const prefixLength = Number(subnet.slice(separatorIndex + 1))
  const hostCount = 2 ** (ADDRESS_BIT_COUNT - prefixLength)

  return {
    networkNumber,
    broadcastNumber: networkNumber + hostCount - 1,
    prefixLength,
    hostCount,
  }
}
