import type { z } from "zod"
import type { Amneziawg3IntensitySchema } from "./Amneziawg3IntensitySchema"

export type Amneziawg3Intensity = z.infer<typeof Amneziawg3IntensitySchema>
