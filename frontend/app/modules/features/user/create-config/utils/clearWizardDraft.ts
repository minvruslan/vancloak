import { WIZARD_DRAFT_STORAGE_KEY } from "../constants/WIZARD_DRAFT_STORAGE_KEY"

export function clearWizardDraft(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY)
  } catch {
    return
  }
}
