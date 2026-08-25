const REQUIRED_PUBLIC_CONFIG_KEYS = ["apiBaseUrl", "authBaseUrl"] as const

function buildEnvironmentVariableName(key: string): string {
  return `NUXT_PUBLIC_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`
}

export default defineNitroPlugin(() => {
  const publicConfig = useRuntimeConfig().public
  const missingKeys = REQUIRED_PUBLIC_CONFIG_KEYS.filter((key) => !publicConfig[key])

  if (missingKeys.length === 0) return

  console.error(
    `Invalid environment: ${missingKeys.map(buildEnvironmentVariableName).join(", ")} must be set.`,
  )
  process.exit(1)
})
