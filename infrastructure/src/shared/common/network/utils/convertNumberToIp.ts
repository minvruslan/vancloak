const OCTET_SHIFTS = [24, 16, 8, 0]
const OCTET_MASK = 255

export function convertNumberToIp(value: number): string {
  return OCTET_SHIFTS.map((shift) => (value >>> shift) & OCTET_MASK).join(".")
}
