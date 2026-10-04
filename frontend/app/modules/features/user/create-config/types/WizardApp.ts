import type { WizardAppId } from "./WizardAppId"
import type { WizardAppInstallSource } from "./WizardAppInstallSource"

export type WizardApp = {
  id: WizardAppId
  name: string
  iconUrl: string
  installSource: WizardAppInstallSource
  installUrl: string
}
