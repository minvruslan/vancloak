import { clearWizardDraft } from "./clearWizardDraft"
import { clearWizardResult } from "./clearWizardResult"

export function clearCreateConfigWizardStorage(): void {
  clearWizardDraft()
  clearWizardResult()
}
