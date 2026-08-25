import { access, constants } from "node:fs/promises"
import { delimiter, join } from "node:path"
import { CommandRunnerMode } from "../constants/index.js"

const REQUIRED_BINARY_NAMES = [
  "ssh",
  "ssh-keygen",
  "ssh-keyscan",
  "sshpass",
  "ansible-playbook",
  "ansible-galaxy",
]

async function isExecutableInPath(binaryName: string, searchPaths: string[]): Promise<boolean> {
  for (const searchPath of searchPaths) {
    try {
      await access(join(searchPath, binaryName), constants.X_OK)
      return true
    } catch {
      continue
    }
  }

  return false
}

export async function assertCommandRunnerBinariesExist(): Promise<void> {
  if (CommandRunnerMode !== "direct") return

  const searchPaths = (process.env.PATH ?? "").split(delimiter).filter(Boolean)
  const missingBinaryNames: string[] = []

  for (const binaryName of REQUIRED_BINARY_NAMES) {
    if (!(await isExecutableInPath(binaryName, searchPaths))) missingBinaryNames.push(binaryName)
  }

  if (missingBinaryNames.length > 0) {
    throw new Error(
      `Command runner binaries not found in PATH: ${missingBinaryNames.join(", ")}. ` +
        `The image is packaged incorrectly.`,
    )
  }
}
