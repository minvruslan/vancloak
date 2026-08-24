import { WIZARD_RESULT_STORAGE_KEY } from "../constants/WIZARD_RESULT_STORAGE_KEY"
import type { WizardResult } from "../types/WizardResult"

export function writeWizardResult(result: Omit<WizardResult, "savedAt">): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      WIZARD_RESULT_STORAGE_KEY,
      JSON.stringify({ ...result, savedAt: Date.now() } satisfies WizardResult),
    )
  } catch {
    return
  }
}
