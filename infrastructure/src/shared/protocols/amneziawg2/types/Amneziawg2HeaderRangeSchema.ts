import { z } from "zod"
import { parseAmneziawg2HeaderRange } from "../utils/parseAmneziawg2HeaderRange"

const UINT32_MAX = 4294967295
const HIGHEST_RESERVED_MESSAGE_TYPE = 4

export const Amneziawg2HeaderRangeSchema = z
  .string()
  .regex(/^\d+(-\d+)?$/)
  .superRefine((value, context) => {
    const bounds = parseAmneziawg2HeaderRange(value)
    if (!bounds) return

    if (bounds.highest < bounds.lowest) {
      context.addIssue({ code: "custom", message: "Header range must not end below its start" })
    }

    if (bounds.highest > UINT32_MAX) {
      context.addIssue({
        code: "custom",
        message: "Header range must fit in an unsigned 32-bit integer",
      })
    }

    if (bounds.lowest <= HIGHEST_RESERVED_MESSAGE_TYPE) {
      context.addIssue({
        code: "custom",
        message: "Header range must stay above the reserved message types 1-4",
      })
    }
  })
