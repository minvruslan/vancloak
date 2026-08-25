import { WizardDraftStorageKey } from "../constants/WizardDraftStorageKey"
import type { WizardDraft } from "../types/WizardDraft"

export function writeWizardDraft(draft: Omit<WizardDraft, "savedAt">): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      WizardDraftStorageKey,
      JSON.stringify({ ...draft, savedAt: Date.now() } satisfies WizardDraft),
    )
  } catch {
    return
  }
}
