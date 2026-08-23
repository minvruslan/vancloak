import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { PROJECT_NAME } from "../../shared/index.js"

const DOCKERFILE_PATH = join(dirname(fileURLToPath(import.meta.url)), "Dockerfile")

let cachedCommandRunnerImageName: string | null = null

function computeContentHash(): string {
  return createHash("sha256").update(readFileSync(DOCKERFILE_PATH)).digest("hex").slice(0, 12)
}

export const CommandRunnerImage = {
  get name(): string {
    cachedCommandRunnerImageName ??= `${PROJECT_NAME}/command-runner:${computeContentHash()}`
    return cachedCommandRunnerImageName
  },
}
