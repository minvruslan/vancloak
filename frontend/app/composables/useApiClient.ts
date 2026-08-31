import type { ApiClient } from "@vancloak/api-contract"
import { useDemoApiClient, useDemoMode } from "@/modules/demo"

export const useApiClient = (): ApiClient => {
  const { isDemoModeEnabled } = useDemoMode()
  if (isDemoModeEnabled.value) return useDemoApiClient() as ApiClient
  return useNuxtApp().$apiClient
}
