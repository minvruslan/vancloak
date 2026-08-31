import { createDemoUserSession } from "../utils/createDemoUserSession"
import { useDemoConfigsState } from "./useDemoConfigsState"

export function useDemoMode() {
  const isDemoModeEnabled = useState("demo.enabled", () => false)

  async function enterDemoMode(): Promise<void> {
    clearNuxtData()
    useDemoConfigsState().value = []
    useAuthSession().user.value = createDemoUserSession()
    isDemoModeEnabled.value = true
    await navigateTo("/app")
  }

  function exitDemoMode(): void {
    isDemoModeEnabled.value = false
    useAuthSession().user.value = null
    clearNuxtData()
  }

  return { isDemoModeEnabled, enterDemoMode, exitDemoMode }
}
