import type { z } from "zod"
import type { Amneziawg2ConfigOptionsSchema } from "./Amneziawg2ConfigOptionsSchema"

export type Amneziawg2ConfigOptions = z.infer<typeof Amneziawg2ConfigOptionsSchema>
