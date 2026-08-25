import { CommandRunnerMode } from "../constants/index.js"

export function resolveCommandRunnerPath(
  localPath: string,
  containerPath: string,
): { path: string; mount: string[] } {
  if (CommandRunnerMode === "direct") return { path: localPath, mount: [] }
  return { path: containerPath, mount: ["-v", `${localPath}:${containerPath}:ro`] }
}
