import { z } from "zod"
import { DomainNameSchema } from "../../../../common/network/types/DomainNameSchema"
import { IpSchema } from "../../../../common/network/types/IpSchema"
import { PortSchema } from "../../../../common/network/types/PortSchema"
import { Amneziawg2ClientObfuscationSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2ClientObfuscationSchema"
import { Amneziawg2DnsSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2DnsSchema"
import { Amneziawg2KeySchema } from "../../../../protocols/amneziawg2/types/Amneziawg2KeySchema"
import { Amneziawg2MtuSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2MtuSchema"
import { Amneziawg2ServerObfuscationSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2ServerObfuscationSchema"
import { ProtocolCodeSchema } from "../../../../protocols/types/ProtocolCodeSchema"
import { Amneziawg2ObfuscationOptionsSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2ObfuscationOptionsSchema"

export const Amneziawg2ConfigDataSchema = z.object({
  protocolCode: z.literal(ProtocolCodeSchema.enum.amneziawg2),
  clientIp: IpSchema,
  publicKey: z.string().optional(),
  presharedKey: z.string().optional(),
  serverPublicKey: Amneziawg2KeySchema.optional(),
  host: z.union([DomainNameSchema, IpSchema]).optional(),
  port: PortSchema.optional(),
  dns: Amneziawg2DnsSchema.optional(),
  mtu: Amneziawg2MtuSchema.optional(),
  serverObfuscation: Amneziawg2ServerObfuscationSchema.optional(),
  clientObfuscation: Amneziawg2ClientObfuscationSchema.optional(),
  options: Amneziawg2ObfuscationOptionsSchema,
})
