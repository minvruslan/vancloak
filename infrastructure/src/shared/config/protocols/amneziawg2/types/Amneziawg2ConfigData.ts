import type { z } from "zod"
import type { Amneziawg2ConfigDataSchema } from "./Amneziawg2ConfigDataSchema"

export type Amneziawg2ConfigData = z.infer<typeof Amneziawg2ConfigDataSchema>
