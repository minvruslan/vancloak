import type { z } from "zod"
import type { TransportProtocol } from "../../common/network/types/TransportProtocol"
import type { EndpointActualState } from "../../endpoint/types/EndpointActualState"
import type { EndpointDesiredState } from "../../endpoint/types/EndpointDesiredState"
import { Amneziawg2EndpointActualStateSchema } from "../../endpoint/protocols/amneziawg2/types/Amneziawg2EndpointActualStateSchema"
import { Amneziawg2EndpointDesiredStateSchema } from "../../endpoint/protocols/amneziawg2/types/Amneziawg2EndpointDesiredStateSchema"
import { Amneziawg2ClientIdentifierSchema } from "../../config/protocols/amneziawg2/types/Amneziawg2ClientIdentifierSchema"
import { Amneziawg2ConfigDataSchema } from "../../config/protocols/amneziawg2/types/Amneziawg2ConfigDataSchema"
import { Amneziawg2ConfigOptionsSchema } from "../../config/protocols/amneziawg2/types/Amneziawg2ConfigOptionsSchema"
import { Amneziawg2ObfuscationDefaults } from "../amneziawg2/constants/Amneziawg2ObfuscationDefaults"
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
  amneziawg2: {
    family: "amneziawg",
    name: "AmneziaWG 2",
    defaultPort: 443,
    transportProtocol: "udp",
    configDataSchema: Amneziawg2ConfigDataSchema,
    configOptionsSchema: Amneziawg2ConfigOptionsSchema,
    configOptionsDefaults: { protocolCode: "amneziawg2", ...Amneziawg2ObfuscationDefaults },
    clientIdentifierSchema: Amneziawg2ClientIdentifierSchema,
    endpointDesiredStateSchema: Amneziawg2EndpointDesiredStateSchema,
    endpointActualStateSchema: Amneziawg2EndpointActualStateSchema,
  },
} as const satisfies Record<ProtocolCode, ProtocolRegistryRecord>
