import { access, readFile } from "node:fs/promises"
import { resolve } from "node:path"
import {
  InfrastructureAssetsManifestFileName,
  InfrastructureAssetsDirectoryPath,
} from "./constants/index.js"

const REQUIRED_ASSET_PATHS = [
  "remote-server/ansible",
  "remote-server/protocols/amneziawg3/ansible",
  "remote-server/protocols/amneziawg3/scripts",
  "command-runner/image/Dockerfile",
]

async function readManifestAssetPaths(): Promise<string[] | null> {
  const manifestPath = resolve(
    InfrastructureAssetsDirectoryPath,
    InfrastructureAssetsManifestFileName,
  )

  let content: string
  try {
    content = await readFile(manifestPath, "utf8")
  } catch {
    return null
  }

  const parsed: unknown = JSON.parse(content)
  const isValid =
    Array.isArray(parsed) && parsed.length > 0 && parsed.every((entry) => typeof entry === "string")
  if (!isValid) throw new Error(`Invalid infrastructure assets manifest: ${manifestPath}.`)

  return parsed as string[]
}

export async function assertInfrastructureAssetsExist(): Promise<void> {
  const relativePaths = (await readManifestAssetPaths()) ?? REQUIRED_ASSET_PATHS
  const missingPaths: string[] = []

  for (const relativePath of relativePaths) {
    const path = resolve(InfrastructureAssetsDirectoryPath, relativePath)

    try {
      await access(path)
    } catch {
      missingPaths.push(path)
    }
  }

  if (missingPaths.length > 0) {
    throw new Error(`Infrastructure assets not found: ${missingPaths.join(", ")}.`)
  }
}
