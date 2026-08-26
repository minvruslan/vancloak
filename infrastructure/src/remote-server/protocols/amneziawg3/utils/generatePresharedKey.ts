import { randomBytes } from "node:crypto"

const PRESHARED_KEY_BYTES = 32

export function generatePresharedKey(): string {
  return randomBytes(PRESHARED_KEY_BYTES).toString("base64")
}
