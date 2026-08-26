import type { z } from "zod"
import type { Amneziawg3ObfuscationOptionsSchema } from "./Amneziawg3ObfuscationOptionsSchema"

export type Amneziawg3ObfuscationOptions = z.infer<typeof Amneziawg3ObfuscationOptionsSchema>
