import { z } from "zod"
import { DomainNameSchema } from "../../../../common/network/types/DomainNameSchema"
import { IpSchema } from "../../../../common/network/types/IpSchema"
import { PortSchema } from "../../../../common/network/types/PortSchema"
import { Amneziawg3ClientObfuscationSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3ClientObfuscationSchema"
import { Amneziawg3DnsSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3DnsSchema"
import { Amneziawg3KeySchema } from "../../../../protocols/amneziawg3/types/Amneziawg3KeySchema"
import { Amneziawg3MtuSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3MtuSchema"
import { Amneziawg3ServerObfuscationSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3ServerObfuscationSchema"
import { ProtocolCodeSchema } from "../../../../protocols/types/ProtocolCodeSchema"
import { Amneziawg3ObfuscationOptionsSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3ObfuscationOptionsSchema"

export const Amneziawg3ConfigDataSchema = z.object({
  protocolCode: z.literal(ProtocolCodeSchema.enum.amneziawg3),
  clientIp: IpSchema,
  publicKey: z.string().optional(),
  presharedKey: z.string().optional(),
  serverPublicKey: Amneziawg3KeySchema.optional(),
  host: z.union([DomainNameSchema, IpSchema]).optional(),
  port: PortSchema.optional(),
  dns: Amneziawg3DnsSchema.optional(),
  mtu: Amneziawg3MtuSchema.optional(),
  serverObfuscation: Amneziawg3ServerObfuscationSchema.optional(),
  clientObfuscation: Amneziawg3ClientObfuscationSchema.optional(),
  options: Amneziawg3ObfuscationOptionsSchema,
})
