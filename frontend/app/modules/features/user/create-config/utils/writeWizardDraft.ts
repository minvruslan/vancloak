import { WIZARD_DRAFT_STORAGE_KEY } from "../constants/WIZARD_DRAFT_STORAGE_KEY"
import type { WizardDraft } from "../types/WizardDraft"

export function writeWizardDraft(draft: Omit<WizardDraft, "savedAt">): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      WIZARD_DRAFT_STORAGE_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() } satisfies WizardDraft),
    )
  } catch {
    return
  }
}
