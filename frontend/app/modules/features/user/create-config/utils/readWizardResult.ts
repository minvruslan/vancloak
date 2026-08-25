import { WizardResultStorageKey } from "../constants/WizardResultStorageKey"
import { WizardResultTtlMs } from "../constants/WizardResultTtlMs"
import type { WizardResult } from "../types/WizardResult"
import { WizardResultSchema } from "../types/WizardResultSchema"
import { clearWizardResult } from "./clearWizardResult"

export function readWizardResult(userId: string): WizardResult | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(WizardResultStorageKey)
    if (!raw) return null
    const parsed = WizardResultSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    if (Date.now() - parsed.data.savedAt > WizardResultTtlMs) {
      clearWizardResult()
      return null
    }
    if (parsed.data.userId !== userId) return null
    return parsed.data
  } catch {
    return null
  }
}
