import type { z } from "zod"
import type { Amneziawg3ConfigOptionsSchema } from "./Amneziawg3ConfigOptionsSchema"

export type Amneziawg3ConfigOptions = z.infer<typeof Amneziawg3ConfigOptionsSchema>
