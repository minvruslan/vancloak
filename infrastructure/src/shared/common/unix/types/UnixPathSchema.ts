import { z } from "zod"

export const UnixPathSchema = z.string().regex(/^\/[a-zA-Z0-9._/-]*$/)
