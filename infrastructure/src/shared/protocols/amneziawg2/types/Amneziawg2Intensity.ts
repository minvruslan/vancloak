import type { z } from "zod"
import type { Amneziawg2IntensitySchema } from "./Amneziawg2IntensitySchema"

export type Amneziawg2Intensity = z.infer<typeof Amneziawg2IntensitySchema>
