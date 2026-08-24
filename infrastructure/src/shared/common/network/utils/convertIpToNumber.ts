export function convertIpToNumber(ip: string): number {
  return ip.split(".").reduce((accumulator, octet) => accumulator * 256 + Number(octet), 0)
}
