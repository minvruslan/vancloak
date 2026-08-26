import { generateKeyPairSync } from "node:crypto"

export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync("x25519")
  const rawPrivateKey = privateKey.export({ type: "pkcs8", format: "der" }).subarray(-32)
  const rawPublicKey = publicKey.export({ type: "spki", format: "der" }).subarray(-32)
  return {
    privateKey: rawPrivateKey.toString("base64"),
    publicKey: rawPublicKey.toString("base64"),
  }
}
