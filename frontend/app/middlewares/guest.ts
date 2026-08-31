import { useDemoMode } from "@/modules/demo"

export default defineNuxtRouteMiddleware(() => {
  const { isDemoModeEnabled, exitDemoMode } = useDemoMode()

  if (isDemoModeEnabled.value) {
    exitDemoMode()
    return
  }

  const { isLoggedIn, isAdmin } = useAuthSession()

  if (isLoggedIn.value) return navigateTo(isAdmin.value ? "/admin" : "/app")
})
