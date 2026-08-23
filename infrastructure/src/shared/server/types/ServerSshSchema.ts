import { z } from "zod"
import { PortSchema } from "../../common/network/types/PortSchema"
import { UnixUsernameSchema } from "../../common/unix/types/UnixUsernameSchema"

export const ServerSshSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("password"),
    username: UnixUsernameSchema,
    password: z.string().min(1),
    port: PortSchema,
  }),
  z.object({
    type: z.literal("privateKey"),
    username: UnixUsernameSchema,
    port: PortSchema,
  }),
])
