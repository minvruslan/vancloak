import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"
import { InfrastructureAssetsManifestFileName } from "../infrastructure/src/assets/constants/InfrastructureAssetsManifestFileName.js"

const PACKAGE_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const SOURCE_DIRECTORY = resolve(PACKAGE_DIRECTORY, "src")
const OUTPUT_DIRECTORY = resolve(PACKAGE_DIRECTORY, "dist")
const INFRASTRUCTURE_SOURCE_DIRECTORY = resolve(PACKAGE_DIRECTORY, "..", "infrastructure", "src")
const INFRASTRUCTURE_ASSETS_OUTPUT_DIRECTORY = resolve(OUTPUT_DIRECTORY, "assets", "infrastructure")
const LICENSES_OUTPUT_DIRECTORY = resolve(OUTPUT_DIRECTORY, "licenses")
const VENDOR_DIRECTORY_NAME = "vendor"
const LICENSE_FILE_PATTERN = /^LICEN[CS]E/

const ENTRY_POINT_PATHS = [
  resolve(SOURCE_DIRECTORY, "api", "index.ts"),
  resolve(SOURCE_DIRECTORY, "worker", "index.ts"),
  resolve(SOURCE_DIRECTORY, "migrate.ts"),
]

type VendorLicenseResult = {
  copiedCount: number
  directoriesWithoutLicense: string[]
}

const WORKSPACE_PACKAGE_ENTRY_POINTS = {
  "@vancloak/api-contract": resolve(PACKAGE_DIRECTORY, "..", "api-contract", "src", "index.ts"),
  "@vancloak/infrastructure": resolve(PACKAGE_DIRECTORY, "..", "infrastructure", "src", "index.ts"),
  "@vancloak/infrastructure/shared": resolve(
    PACKAGE_DIRECTORY,
    "..",
    "infrastructure",
    "src",
    "shared",
    "index.ts",
  ),
}

async function copyAssets(
  sourceDirectory: string,
  targetDirectory: string,
  relativePrefix = "",
): Promise<string[]> {
  const entries = await readdir(sourceDirectory, { withFileTypes: true })
  const copiedRelativePaths: string[] = []

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue

    const source = resolve(sourceDirectory, entry.name)
    const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      if (entry.name === VENDOR_DIRECTORY_NAME) continue
      copiedRelativePaths.push(
        ...(await copyAssets(source, resolve(targetDirectory, entry.name), relativePath)),
      )
      continue
    }

    if (entry.name.endsWith(".ts")) continue

    await mkdir(targetDirectory, { recursive: true })
    await copyFile(source, resolve(targetDirectory, entry.name))
    copiedRelativePaths.push(relativePath)
  }

  return copiedRelativePaths
}

async function copyVendorLicenses(sourceDirectory: string): Promise<VendorLicenseResult> {
  const entries = await readdir(sourceDirectory, { withFileTypes: true })
  const result: VendorLicenseResult = { copiedCount: 0, directoriesWithoutLicense: [] }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const source = resolve(sourceDirectory, entry.name)

    if (entry.name !== VENDOR_DIRECTORY_NAME) {
      const nested = await copyVendorLicenses(source)
      result.copiedCount += nested.copiedCount
      result.directoriesWithoutLicense.push(...nested.directoriesWithoutLicense)
      continue
    }

    for (const vendored of await readdir(source, { withFileTypes: true })) {
      if (!vendored.isDirectory()) continue

      const vendoredDirectory = resolve(source, vendored.name)
      const targetDirectory = resolve(LICENSES_OUTPUT_DIRECTORY, vendored.name)
      let vendoredCopiedCount = 0

      for (const file of await readdir(vendoredDirectory, { withFileTypes: true })) {
        if (!file.isFile() || !LICENSE_FILE_PATTERN.test(file.name)) continue

        await mkdir(targetDirectory, { recursive: true })
        await copyFile(resolve(vendoredDirectory, file.name), resolve(targetDirectory, file.name))
        vendoredCopiedCount += 1
      }

      if (vendoredCopiedCount === 0) result.directoriesWithoutLicense.push(vendoredDirectory)
      result.copiedCount += vendoredCopiedCount
    }
  }

  return result
}

await rm(OUTPUT_DIRECTORY, { recursive: true, force: true })

const result = await build({
  metafile: true,
  entryPoints: ENTRY_POINT_PATHS,
  outdir: OUTPUT_DIRECTORY,
  outbase: SOURCE_DIRECTORY,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: "linked",
  sourcesContent: false,
  packages: "external",
  alias: WORKSPACE_PACKAGE_ENTRY_POINTS,
})

const bundledPackagePaths = Object.keys(result.metafile.inputs).filter((path) =>
  path.includes("node_modules/"),
)

if (bundledPackagePaths.length > 0) {
  const packageNames = new Set(
    bundledPackagePaths.map((path) => path.replace(/^.*node_modules\//, "").split("/")[0]),
  )
  throw new Error(
    `Packages bundled instead of kept external: ${[...packageNames].join(", ")}. ` +
      `Declare them in the backend dependencies.`,
  )
}

const declaredDependencies = new Set(
  Object.keys(
    (
      JSON.parse(await readFile(resolve(PACKAGE_DIRECTORY, "package.json"), "utf8")) as {
        dependencies: Record<string, string>
      }
    ).dependencies,
  ),
)

const undeclaredPackageNames = [
  ...new Set(
    Object.values(result.metafile.outputs)
      .flatMap((output) => output.imports)
      .filter((imported) => imported.external)
      .map((imported) => imported.path)
      .filter((path) => !path.startsWith("node:"))
      .map((path) =>
        path.startsWith("@") ? path.split("/").slice(0, 2).join("/") : path.split("/")[0],
      ),
  ),
].filter((name) => !declaredDependencies.has(name))

if (undeclaredPackageNames.length > 0) {
  throw new Error(
    `Bundle imports packages missing from the backend dependencies: ${undeclaredPackageNames.join(", ")}.`,
  )
}

const copiedAssetPaths = await copyAssets(
  INFRASTRUCTURE_SOURCE_DIRECTORY,
  INFRASTRUCTURE_ASSETS_OUTPUT_DIRECTORY,
)

if (copiedAssetPaths.length === 0) {
  throw new Error(`No infrastructure assets found under ${INFRASTRUCTURE_SOURCE_DIRECTORY}.`)
}

await writeFile(
  resolve(INFRASTRUCTURE_ASSETS_OUTPUT_DIRECTORY, InfrastructureAssetsManifestFileName),
  JSON.stringify([...copiedAssetPaths].sort(), null, 2),
)

const { copiedCount: copiedLicenseCount, directoriesWithoutLicense } = await copyVendorLicenses(
  INFRASTRUCTURE_SOURCE_DIRECTORY,
)

if (copiedLicenseCount === 0) {
  throw new Error(`No vendored licence found under ${INFRASTRUCTURE_SOURCE_DIRECTORY}.`)
}

if (directoriesWithoutLicense.length > 0) {
  throw new Error(
    `Vendored directories without a licence: ${directoriesWithoutLicense.join(", ")}.`,
  )
}

console.log(
  `Bundled ${ENTRY_POINT_PATHS.length} entry points, copied ${copiedAssetPaths.length} infrastructure assets ` +
    `and ${copiedLicenseCount} vendored licences.`,
)
