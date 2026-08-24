import type { z } from "zod"
import type { WizardDraftSchema } from "./WizardDraftSchema"

export type WizardDraft = z.infer<typeof WizardDraftSchema>
