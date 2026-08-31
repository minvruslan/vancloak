import type { Config } from "@vancloak/api-contract"

export function useDemoConfigsState() {
  return useState<Config[]>("demo.configs", () => [])
}
