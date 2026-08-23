import type { z } from "zod"
import type { Amneziawg2ClientObfuscationSchema } from "./Amneziawg2ClientObfuscationSchema"

export type Amneziawg2ClientObfuscation = z.infer<typeof Amneziawg2ClientObfuscationSchema>
