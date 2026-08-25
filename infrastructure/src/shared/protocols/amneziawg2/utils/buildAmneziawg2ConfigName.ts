import slugify from "@sindresorhus/slugify"

const FALLBACK_NAME = "config"

export function buildAmneziawg2ConfigName(
  serverName: string,
  maximumLength = Number.POSITIVE_INFINITY,
): string {
  const name = slugify(serverName, { decamelize: false }).slice(0, maximumLength).replace(/-$/, "")
  return name || FALLBACK_NAME
}
