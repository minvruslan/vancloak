import { verifyLoginToken } from "../services"

export function useVerifyLogin() {
  const { isLoggedIn, isAdmin, refresh } = useAuthSession()
  const token = ref<string | null>(null)
  const pending = ref(false)
  const failed = ref(false)

  function consumeTokenFromHash(): string | null {
    const tokenFromHash = new URLSearchParams(window.location.hash.slice(1)).get("token")
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    )
    return tokenFromHash
  }

  function onHashChange() {
    if (pending.value) return
    const tokenFromHash = consumeTokenFromHash()
    if (!tokenFromHash) return
    token.value = tokenFromHash
    failed.value = false
  }

  onMounted(() => {
    token.value = consumeTokenFromHash()
    if (!token.value) failed.value = true
    window.addEventListener("hashchange", onHashChange)
  })

  onUnmounted(() => {
    window.removeEventListener("hashchange", onHashChange)
  })

  async function submit() {
    if (!token.value || pending.value) return
    pending.value = true
    try {
      await verifyLoginToken(token.value)
      await refresh()
      if (!isLoggedIn.value) {
        failed.value = true
        return
      }
      await navigateTo(isAdmin.value ? "/admin" : "/app")
    } catch {
      failed.value = true
    } finally {
      pending.value = false
    }
  }

  return { pending, failed, submit }
}
