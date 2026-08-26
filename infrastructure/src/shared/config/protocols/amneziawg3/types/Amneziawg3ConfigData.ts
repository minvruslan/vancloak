import type { z } from "zod"
import type { Amneziawg3ConfigDataSchema } from "./Amneziawg3ConfigDataSchema"

export type Amneziawg3ConfigData = z.infer<typeof Amneziawg3ConfigDataSchema>
