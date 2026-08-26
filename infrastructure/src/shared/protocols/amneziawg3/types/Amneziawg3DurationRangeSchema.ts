import { z } from "zod"
import { parseAmneziawg3Range } from "../utils/parseAmneziawg3Range"

const UINT16_MAX = 65535

export const Amneziawg3DurationRangeSchema = z
  .string()
  .regex(/^\d+(-\d+)?$/)
  .superRefine((value, context) => {
    const bounds = parseAmneziawg3Range(value)
    if (!bounds) return

    if (bounds.highest < bounds.lowest) {
      context.addIssue({ code: "custom", message: "Duration range must not end below its start" })
    }

    if (bounds.highest > UINT16_MAX) {
      context.addIssue({
        code: "custom",
        message: "Duration range must fit in an unsigned 16-bit integer",
      })
    }
  })
