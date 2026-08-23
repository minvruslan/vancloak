import type { z } from "zod"
import type { Amneziawg2ObfuscationOptionsSchema } from "./Amneziawg2ObfuscationOptionsSchema"

export type Amneziawg2ObfuscationOptions = z.infer<typeof Amneziawg2ObfuscationOptionsSchema>
