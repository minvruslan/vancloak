import { resolve } from "node:path"
import { InfrastructureAssetsDirectoryPath } from "../../../assets/index.js"

export const CommandRunnerImageDirectoryPath = resolve(
  InfrastructureAssetsDirectoryPath,
  "command-runner",
  "image",
)
