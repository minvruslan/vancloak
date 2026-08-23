import { z } from "zod"
import { ProtocolCodeSchema } from "../../../../protocols/types/ProtocolCodeSchema"
import { DomainNameSchema } from "../../../../common/network/types/DomainNameSchema"
import { IpSchema } from "../../../../common/network/types/IpSchema"
import { UnixPathSchema } from "../../../../common/unix/types/UnixPathSchema"
import { EndpointDesiredStateSchema } from "../../../types/EndpointDesiredStateSchema"
import { Amneziawg2DnsSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2DnsSchema"
import { Amneziawg2KeySchema } from "../../../../protocols/amneziawg2/types/Amneziawg2KeySchema"
import { Amneziawg2MtuSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2MtuSchema"
import { Amneziawg2ServerObfuscationSchema } from "../../../../protocols/amneziawg2/types/Amneziawg2ServerObfuscationSchema"

const NameSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/)

export const Amneziawg2EndpointDesiredStateSchema = EndpointDesiredStateSchema.extend({
  protocolCode: z.literal(ProtocolCodeSchema.enum.amneziawg2),
  host: z.union([DomainNameSchema, IpSchema]),
  dns: Amneziawg2DnsSchema,
  dockerImageVersion: z.string(),
  containerName: NameSchema,
  directoryName: NameSchema,
  stateDirectoryName: NameSchema,
  containerStateDirectoryPath: UnixPathSchema,
  interfaceName: z.string().regex(/^[a-zA-Z0-9_-]{1,15}$/),
  subnetPrefix: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/),
  mtu: Amneziawg2MtuSchema,
  serverPrivateKey: Amneziawg2KeySchema,
  serverPublicKey: Amneziawg2KeySchema,
  obfuscation: Amneziawg2ServerObfuscationSchema,
}).check((context) => {
  if (context.value.obfuscation.jmax > context.value.mtu) {
    context.issues.push({
      code: "custom",
      message: "Jmax must not exceed the tunnel MTU",
      input: context.value,
      path: ["obfuscation", "jmax"],
    })
  }
})
