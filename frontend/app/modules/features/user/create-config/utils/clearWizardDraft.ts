import { WizardDraftStorageKey } from "../constants/WizardDraftStorageKey"

export function clearWizardDraft(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(WizardDraftStorageKey)
  } catch {
    return
  }
}
