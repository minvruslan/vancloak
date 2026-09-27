import { createAuthClient } from "better-auth/vue"
import { emailOTPClient, adminClient } from "better-auth/client/plugins"

export default defineNuxtPlugin(async () => {
  const {
    public: { authBaseUrl },
  } = useRuntimeConfig()

  const authClient = createAuthClient({
    baseURL: import.meta.server ? authBaseUrl : window.location.origin,
    plugins: [emailOTPClient(), adminClient()],
  })

  if (import.meta.server) {
    await useAuthSession().refresh()
  }

  return { provide: { authClient } }
})
