import { z } from "zod"

const MINIMUM_MTU = 576
const MAXIMUM_MTU = 1500

export const Amneziawg3MtuSchema = z.number().int().min(MINIMUM_MTU).max(MAXIMUM_MTU)
