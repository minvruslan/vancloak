import type { z } from "zod"
import type { WizardResultSchema } from "./WizardResultSchema"

export type WizardResult = z.infer<typeof WizardResultSchema>
