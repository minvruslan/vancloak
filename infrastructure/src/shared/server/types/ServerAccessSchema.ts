import { z } from "zod"
import { IpSchema } from "../../common/network/types/IpSchema"
import { PortSchema } from "../../common/network/types/PortSchema"
import { UnixUsernameSchema } from "../../common/unix/types/UnixUsernameSchema"

const ServerAccessBaseSchema = z.object({
  ip: IpSchema,
  port: PortSchema,
  username: UnixUsernameSchema,
  sshHostKeys: z.array(z.string().min(1)).min(1),
})

export const ServerAccessSchema = z.union([
  ServerAccessBaseSchema.extend({ privateKey: z.string().min(1) }),
  ServerAccessBaseSchema.extend({ password: z.string().min(1) }),
])
