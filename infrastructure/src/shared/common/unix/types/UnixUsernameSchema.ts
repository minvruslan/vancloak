import { z } from "zod"

export const UnixUsernameSchema = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/)
