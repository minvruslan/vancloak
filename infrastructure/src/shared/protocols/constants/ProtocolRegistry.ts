import type { z } from "zod"
import type { TransportProtocol } from "../../common/network/types/TransportProtocol"
import type { EndpointActualState } from "../../endpoint/types/EndpointActualState"
import type { EndpointDesiredState } from "../../endpoint/types/EndpointDesiredState"
import { Amneziawg3EndpointActualStateSchema } from "../../endpoint/protocols/amneziawg3/types/Amneziawg3EndpointActualStateSchema"
import { Amneziawg3EndpointDesiredStateSchema } from "../../endpoint/protocols/amneziawg3/types/Amneziawg3EndpointDesiredStateSchema"
import { Amneziawg3ClientIdentifierSchema } from "../../config/protocols/amneziawg3/types/Amneziawg3ClientIdentifierSchema"
import { Amneziawg3ConfigDataSchema } from "../../config/protocols/amneziawg3/types/Amneziawg3ConfigDataSchema"
import { Amneziawg3ConfigOptionsSchema } from "../../config/protocols/amneziawg3/types/Amneziawg3ConfigOptionsSchema"
import { Amneziawg3ObfuscationDefaults } from "../amneziawg3/constants/Amneziawg3ObfuscationDefaults"
import type { ProtocolCode } from "../types/ProtocolCode"
import type { ProtocolFamilyCode } from "../types/ProtocolFamilyCode"

type ProtocolRegistryRecord = {
  family: ProtocolFamilyCode
  name: string
  defaultPort: number
  transportProtocol: TransportProtocol
  configDataSchema: z.ZodObject
  configOptionsSchema: z.ZodObject
  configOptionsDefaults: { protocolCode: ProtocolCode }
  clientIdentifierSchema: z.ZodType
  endpointDesiredStateSchema: z.ZodType<EndpointDesiredState>
  endpointActualStateSchema: z.ZodType<EndpointActualState>
}

export const ProtocolRegistry = {
  amneziawg3: {
    family: "amneziawg",
    name: "AmneziaWG 3",
    defaultPort: 443,
    transportProtocol: "udp",
    configDataSchema: Amneziawg3ConfigDataSchema,
    configOptionsSchema: Amneziawg3ConfigOptionsSchema,
    configOptionsDefaults: { protocolCode: "amneziawg3", ...Amneziawg3ObfuscationDefaults },
    clientIdentifierSchema: Amneziawg3ClientIdentifierSchema,
    endpointDesiredStateSchema: Amneziawg3EndpointDesiredStateSchema,
    endpointActualStateSchema: Amneziawg3EndpointActualStateSchema,
  },
} as const satisfies Record<ProtocolCode, ProtocolRegistryRecord>
