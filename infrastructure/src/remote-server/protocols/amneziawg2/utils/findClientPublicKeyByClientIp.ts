export function findClientPublicKeyByClientIp(
  allowedIpsOutput: string,
  clientIp: string,
): string | undefined {
  const target = `${clientIp}/32`
  for (const line of allowedIpsOutput.trim().split("\n")) {
    const parts = line.trim().split(/\s+/)
    const clientPublicKey = parts[0]
    if (clientPublicKey && parts.slice(1).includes(target)) return clientPublicKey
  }
  return undefined
}
