import { ConfigSchema } from "@vancloak/api-contract"
import { z } from "zod"
import { WizardAppIdSchema } from "./WizardAppIdSchema"

export const WizardResultSchema = z.object({
  userId: z.string(),
  savedAt: z.number(),
  deviceTypeId: z.string(),
  appId: WizardAppIdSchema,
  created: ConfigSchema.extend({
    clientConfiguration: z.string(),
    clientConfigurationLink: z.string(),
  }),
})
