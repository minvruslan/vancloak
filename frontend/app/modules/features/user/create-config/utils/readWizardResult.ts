import { WIZARD_RESULT_STORAGE_KEY } from "../constants/WIZARD_RESULT_STORAGE_KEY"
import { WIZARD_RESULT_TTL_MS } from "../constants/WIZARD_RESULT_TTL_MS"
import type { WizardResult } from "../types/WizardResult"
import { WizardResultSchema } from "../types/WizardResultSchema"
import { clearWizardResult } from "./clearWizardResult"

export function readWizardResult(userId: string): WizardResult | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(WIZARD_RESULT_STORAGE_KEY)
    if (!raw) return null
    const parsed = WizardResultSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    if (Date.now() - parsed.data.savedAt > WIZARD_RESULT_TTL_MS) {
      clearWizardResult()
      return null
    }
    if (parsed.data.userId !== userId) return null
    return parsed.data
  } catch {
    return null
  }
}
