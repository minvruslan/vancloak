import type { z } from "zod"
import type { Amneziawg3ClientObfuscationSchema } from "./Amneziawg3ClientObfuscationSchema"

export type Amneziawg3ClientObfuscation = z.infer<typeof Amneziawg3ClientObfuscationSchema>
