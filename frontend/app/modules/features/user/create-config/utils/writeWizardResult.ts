import { WizardResultStorageKey } from "../constants/WizardResultStorageKey"
import type { WizardResult } from "../types/WizardResult"

export function writeWizardResult(result: Omit<WizardResult, "savedAt">): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      WizardResultStorageKey,
      JSON.stringify({ ...result, savedAt: Date.now() } satisfies WizardResult),
    )
  } catch {
    return
  }
}
