import { z } from "zod"
import { Amneziawg3ClientObfuscationSchema } from "./Amneziawg3ClientObfuscationSchema"
import { Amneziawg3DurationRangeSchema } from "./Amneziawg3DurationRangeSchema"
import { Amneziawg3HeaderRangeSchema } from "./Amneziawg3HeaderRangeSchema"
import { Amneziawg3KeySchema } from "./Amneziawg3KeySchema"
import { parseAmneziawg3Range } from "../utils/parseAmneziawg3Range"

const UINT32_MAX = 4294967295

const HANDSHAKE_INITIATION_SIZE = 148
const HANDSHAKE_RESPONSE_SIZE = 92
const HANDSHAKE_COOKIE_SIZE = 64

const HEADER_CIPHER_NONCE_SIZE = 12

const PaddingSchema = z.number().int().min(0).max(UINT32_MAX)

export const Amneziawg3ServerObfuscationSchema = Amneziawg3ClientObfuscationSchema.extend({
  s1: PaddingSchema,
  s2: PaddingSchema,
  s3: PaddingSchema,
  s4: PaddingSchema,
  h1: Amneziawg3HeaderRangeSchema,
  h2: Amneziawg3HeaderRangeSchema,
  h3: Amneziawg3HeaderRangeSchema,
  h4: Amneziawg3HeaderRangeSchema,
  headerProtectionKey: Amneziawg3KeySchema,
  rekeyAfterTime: Amneziawg3DurationRangeSchema,
  rekeyTimeout: Amneziawg3DurationRangeSchema,
  rejectAfterTime: Amneziawg3DurationRangeSchema,
  keepaliveTimeout: Amneziawg3DurationRangeSchema,
  maxHandshakeAttempts: Amneziawg3DurationRangeSchema,
  disableCookies: z.boolean().default(false),
}).superRefine((obfuscation, context) => {
  if (obfuscation.jmin >= obfuscation.jmax) {
    context.addIssue({
      code: "custom",
      message: "Jmin must be less than Jmax",
    })
  }

  const paddings = [obfuscation.s1, obfuscation.s2, obfuscation.s3, obfuscation.s4]

  if (paddings.some((padding) => padding < HEADER_CIPHER_NONCE_SIZE)) {
    context.addIssue({
      code: "custom",
      message: `S1-S4 must be at least ${HEADER_CIPHER_NONCE_SIZE} when a header protection key is set`,
    })
  }

  const paddedSizes = [
    HANDSHAKE_INITIATION_SIZE + obfuscation.s1,
    HANDSHAKE_RESPONSE_SIZE + obfuscation.s2,
    HANDSHAKE_COOKIE_SIZE + obfuscation.s3,
  ]

  if (new Set(paddedSizes).size !== paddedSizes.length) {
    context.addIssue({
      code: "custom",
      message: "S1-S3 must not pad two handshake messages to the same length",
    })
  }

  const headerRanges = [obfuscation.h1, obfuscation.h2, obfuscation.h3, obfuscation.h4].map(
    parseAmneziawg3Range,
  )

  for (let index = 0; index < headerRanges.length; index++) {
    for (let other = index + 1; other < headerRanges.length; other++) {
      const range = headerRanges[index]
      const otherRange = headerRanges[other]
      if (!range || !otherRange) continue

      if (range.lowest <= otherRange.highest && otherRange.lowest <= range.highest) {
        context.addIssue({
          code: "custom",
          message: `H${index + 1} and H${other + 1} must not overlap`,
        })
      }
    }
  }

  const rekeyAfterTime = parseAmneziawg3Range(obfuscation.rekeyAfterTime)
  const rekeyTimeout = parseAmneziawg3Range(obfuscation.rekeyTimeout)
  const rejectAfterTime = parseAmneziawg3Range(obfuscation.rejectAfterTime)
  const keepaliveTimeout = parseAmneziawg3Range(obfuscation.keepaliveTimeout)
  if (!rekeyAfterTime || !rekeyTimeout || !rejectAfterTime || !keepaliveTimeout) return

  if (rejectAfterTime.lowest <= keepaliveTimeout.lowest + rekeyTimeout.lowest) {
    context.addIssue({
      code: "custom",
      message: "RejectAfterTime must exceed KeepaliveTimeout plus RekeyTimeout",
    })
  }

  if (rekeyAfterTime.highest >= rejectAfterTime.lowest) {
    context.addIssue({
      code: "custom",
      message: "RekeyAfterTime must end before RejectAfterTime begins",
    })
  }
})
