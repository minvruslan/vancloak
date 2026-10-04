import { z } from "zod"
import { WizardStepOrder } from "./WizardStepOrder"
import { WizardAppIdSchema } from "./WizardAppIdSchema"

export const WizardDraftSchema = z.object({
  userId: z.string(),
  savedAt: z.number(),
  step: z.enum(WizardStepOrder),
  deviceTypeId: z.string().nullable(),
  appId: WizardAppIdSchema.nullable(),
  endpointId: z.string().nullable(),
})
