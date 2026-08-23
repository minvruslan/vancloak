import { z } from "zod"

export const Amneziawg2IntensitySchema = z.enum(["low", "medium", "high"])
