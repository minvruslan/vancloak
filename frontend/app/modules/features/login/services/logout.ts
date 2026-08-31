import { useDemoMode } from "@/modules/demo"

export async function logout(): Promise<void> {
  const { isDemoModeEnabled, exitDemoMode } = useDemoMode()

  if (isDemoModeEnabled.value) {
    exitDemoMode()
    await navigateTo("/login")
    return
  }

  const { $authClient } = useNuxtApp()
  await $authClient.signOut()
  useAuthSession().user.value = null
  await navigateTo("/login")
}
