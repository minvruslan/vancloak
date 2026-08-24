import { WIZARD_RESULT_STORAGE_KEY } from "../constants/WIZARD_RESULT_STORAGE_KEY"

export function clearWizardResult(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(WIZARD_RESULT_STORAGE_KEY)
  } catch {
    return
  }
}
