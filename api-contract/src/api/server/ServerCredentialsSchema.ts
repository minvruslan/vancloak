import { z } from "zod"
import { UnixUsernameSchema } from "@vancloak/infrastructure/shared"

export const ServerCredentialsSchema = z.object({
  username: UnixUsernameSchema,
  password: z.string().min(1),
})
