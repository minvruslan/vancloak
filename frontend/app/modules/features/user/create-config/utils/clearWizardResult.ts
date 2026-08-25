import { WizardResultStorageKey } from "../constants/WizardResultStorageKey"

export function clearWizardResult(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(WizardResultStorageKey)
  } catch {
    return
  }
}
