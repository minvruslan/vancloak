import { fileURLToPath } from "node:url"

export const InfrastructureAssetsDirectoryPath =
  process.env.INFRASTRUCTURE_ASSETS_DIRECTORY_PATH ||
  fileURLToPath(new URL("../../", import.meta.url))
