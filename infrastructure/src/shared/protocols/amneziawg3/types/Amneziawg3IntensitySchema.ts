import { z } from "zod"

export const Amneziawg3IntensitySchema = z.enum(["low", "medium", "high"])
