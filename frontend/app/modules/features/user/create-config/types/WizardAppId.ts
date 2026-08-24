import type { z } from "zod"
import type { WizardAppIdSchema } from "./WizardAppIdSchema"

export type WizardAppId = z.infer<typeof WizardAppIdSchema>
