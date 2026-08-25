import { WizardDraftStorageKey } from "../constants/WizardDraftStorageKey"
import { WizardDraftTtlMs } from "../constants/WizardDraftTtlMs"
import type { WizardDraft } from "../types/WizardDraft"
import { WizardDraftSchema } from "../types/WizardDraftSchema"

export function readWizardDraft(userId: string): WizardDraft | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(WizardDraftStorageKey)
    if (!raw) return null
    const parsed = WizardDraftSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    if (parsed.data.userId !== userId) return null
    if (Date.now() - parsed.data.savedAt > WizardDraftTtlMs) return null
    return parsed.data
  } catch {
    return null
  }
}
