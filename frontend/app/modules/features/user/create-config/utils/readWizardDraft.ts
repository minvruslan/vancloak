import { WIZARD_DRAFT_STORAGE_KEY } from "../constants/WIZARD_DRAFT_STORAGE_KEY"
import { WIZARD_DRAFT_TTL_MS } from "../constants/WIZARD_DRAFT_TTL_MS"
import type { WizardDraft } from "../types/WizardDraft"
import { WizardDraftSchema } from "../types/WizardDraftSchema"

export function readWizardDraft(userId: string): WizardDraft | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(WIZARD_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = WizardDraftSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    if (parsed.data.userId !== userId) return null
    if (Date.now() - parsed.data.savedAt > WIZARD_DRAFT_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}
