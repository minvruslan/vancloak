import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ProjectName } from "../../shared/index.js"
import { CommandRunnerImageDirectoryPath } from "./constants/index.js"

const CONTENT_HASH_SOURCE_PATHS = [
  join(CommandRunnerImageDirectoryPath, "Dockerfile"),
  join(CommandRunnerImageDirectoryPath, "dependencies", "ansible", "requirements.yml"),
]

let cachedCommandRunnerImageName: string | null = null

function computeContentHash(): string {
  const hash = createHash("sha256")
  for (const path of CONTENT_HASH_SOURCE_PATHS) hash.update(readFileSync(path))
  return hash.digest("hex").slice(0, 12)
}

export const CommandRunnerImage = {
  get name(): string {
    cachedCommandRunnerImageName ??=
      process.env.COMMAND_RUNNER_IMAGE || `${ProjectName}/command-runner:${computeContentHash()}`
    return cachedCommandRunnerImageName
  },
}
