import { z } from "zod"
import { parseIpSubnet } from "../utils/parseIpSubnet"

const MAXIMUM_PREFIX_LENGTH = 30

export const IpSubnetSchema = z.cidrv4().refine((subnet) => {
  const { networkNumber, prefixLength, hostCount } = parseIpSubnet(subnet)
  return prefixLength <= MAXIMUM_PREFIX_LENGTH && networkNumber % hostCount === 0
}, "Subnet must be a network address with a prefix length of at most 30")
