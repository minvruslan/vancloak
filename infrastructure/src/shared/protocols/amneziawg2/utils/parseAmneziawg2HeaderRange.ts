export function parseAmneziawg2HeaderRange(
  value: string,
): { lowest: number; highest: number } | null {
  const parts = value.split("-").map(Number)
  const lowest = parts[0]
  const highest = parts.length > 1 ? parts[1] : lowest

  if (lowest === undefined || highest === undefined) return null
  if (!Number.isInteger(lowest) || !Number.isInteger(highest)) return null

  return { lowest, highest }
}
