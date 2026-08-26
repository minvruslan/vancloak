import {
  Amneziawg3ObfuscationDefaults,
  Amneziawg3ServerObfuscationSchema,
  type Amneziawg3ObfuscationOptions,
  type Amneziawg3ServerObfuscation,
} from "../../../../shared/index.js"
import { genCfg } from "../vendor/awg-architect/engines/awg/generator/index"
import {
  generateClientObfuscation,
  JUNK_PACKET_COUNT_BY_LEVEL,
} from "./generateClientObfuscation.js"
import { ObfuscationGeneratorBaseInput } from "../constants/index.js"

// The generator reports a draw that pads two handshake messages to the same length as a
// warning rather than an error, so it can return one; the schema rejects it. Generation is
// pure, so an invalid draw is simply discarded and repeated.
const MAXIMUM_GENERATION_ATTEMPTS = 10

export function generateEndpointObfuscation(
  mtu: number,
  options: Amneziawg3ObfuscationOptions = Amneziawg3ObfuscationDefaults,
): Amneziawg3ServerObfuscation {
  for (let attempt = 0; attempt < MAXIMUM_GENERATION_ATTEMPTS; attempt++) {
    const generated = genCfg({
      ...ObfuscationGeneratorBaseInput,
      mtu,
      profile: options.protocolProfile,
      intensity: options.junkPacketSize,
      junkLevel: JUNK_PACKET_COUNT_BY_LEVEL[options.junkPacketCount],
    })

    const parsed = Amneziawg3ServerObfuscationSchema.safeParse({
      ...generateClientObfuscation(mtu, options),
      s1: generated.s1,
      s2: generated.s2,
      s3: generated.s3,
      s4: generated.s4,
      h1: generated.h1,
      h2: generated.h2,
      h3: generated.h3,
      h4: generated.h4,
      headerProtectionKey: generated.awg3?.headerProtectionKey,
      rekeyAfterTime: generated.awg3?.rekeyAfterTime,
      rekeyTimeout: generated.awg3?.rekeyTimeout,
      rejectAfterTime: generated.awg3?.rejectAfterTime,
      keepaliveTimeout: generated.awg3?.keepaliveTimeout,
      maxHandshakeAttempts: generated.awg3?.maxHandshakeAttempts,
    })

    if (parsed.success) return parsed.data
  }

  throw new Error(
    `Failed to generate a valid endpoint obfuscation in ${MAXIMUM_GENERATION_ATTEMPTS} attempts.`,
  )
}
