import { z } from "zod"
import { Amneziawg2ClientObfuscationSchema } from "./Amneziawg2ClientObfuscationSchema"
import { Amneziawg2HeaderRangeSchema } from "./Amneziawg2HeaderRangeSchema"
import { parseAmneziawg2HeaderRange } from "../utils/parseAmneziawg2HeaderRange"

const UINT32_MAX = 4294967295

const HANDSHAKE_INITIATION_SIZE = 148
const HANDSHAKE_RESPONSE_SIZE = 92
const HANDSHAKE_COOKIE_SIZE = 64

const PaddingSchema = z.number().int().min(0).max(UINT32_MAX)

export const Amneziawg2ServerObfuscationSchema = Amneziawg2ClientObfuscationSchema.extend({
  s1: PaddingSchema,
  s2: PaddingSchema,
  s3: PaddingSchema,
  s4: PaddingSchema,
  h1: Amneziawg2HeaderRangeSchema,
  h2: Amneziawg2HeaderRangeSchema,
  h3: Amneziawg2HeaderRangeSchema,
  h4: Amneziawg2HeaderRangeSchema,
}).superRefine((obfuscation, context) => {
  if (obfuscation.jmin >= obfuscation.jmax) {
    context.addIssue({
      code: "custom",
      message: "Jmin must be less than Jmax",
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
    parseAmneziawg2HeaderRange,
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
})
