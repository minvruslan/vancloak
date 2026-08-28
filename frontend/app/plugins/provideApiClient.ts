import { createORPCClient } from "@orpc/client"
import { OpenAPILink } from "@orpc/openapi-client/fetch"
import type { ApiClient } from "@vancloak/api-contract"
import { ApiContract } from "@vancloak/api-contract"

export default defineNuxtPlugin((nuxtApp) => {
  const {
    public: { apiBaseUrl },
  } = useRuntimeConfig()

  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : {}
  const { user } = useAuthSession()

  const link = new OpenAPILink(ApiContract, {
    url: import.meta.server ? `${apiBaseUrl}/api` : `${window.location.origin}/api`,
    headers: () => headers,
    fetch: async (request, init) => {
      const response = await globalThis.fetch(request, init)
      if (import.meta.client && response.status === 401 && user.value) {
        user.value = null
        await nuxtApp.runWithContext(() => navigateTo("/login"))
      }
      return response
    },
  })

  const apiClient: ApiClient = createORPCClient(link)

  return { provide: { apiClient } }
})
