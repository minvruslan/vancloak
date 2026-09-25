import { z } from "zod"
import { ProtocolCodeSchema } from "../../../../protocols/types/ProtocolCodeSchema"
import { IpSubnetSchema } from "../../../../common/network/types/IpSubnetSchema"
import { UnixPathSchema } from "../../../../common/unix/types/UnixPathSchema"
import { EndpointDesiredStateSchema } from "../../../types/EndpointDesiredStateSchema"
import { Amneziawg3DnsSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3DnsSchema"
import { Amneziawg3KeySchema } from "../../../../protocols/amneziawg3/types/Amneziawg3KeySchema"
import { Amneziawg3MtuSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3MtuSchema"
import { Amneziawg3ServerObfuscationSchema } from "../../../../protocols/amneziawg3/types/Amneziawg3ServerObfuscationSchema"

const NameSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/)

export const Amneziawg3EndpointDesiredStateSchema = EndpointDesiredStateSchema.extend({
  protocolCode: z.literal(ProtocolCodeSchema.enum.amneziawg3),
  dns: Amneziawg3DnsSchema,
  dockerImageVersion: z.string(),
  containerName: NameSchema,
  directoryName: NameSchema,
  stateDirectoryName: NameSchema,
  containerStateDirectoryPath: UnixPathSchema,
  interfaceName: z.string().regex(/^[a-zA-Z0-9_-]{1,15}$/),
  subnet: IpSubnetSchema,
  mtu: Amneziawg3MtuSchema,
  serverPrivateKey: Amneziawg3KeySchema,
  serverPublicKey: Amneziawg3KeySchema,
  obfuscation: Amneziawg3ServerObfuscationSchema,
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
