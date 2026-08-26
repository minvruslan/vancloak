import { z } from "zod"

export const Amneziawg3KeySchema = z.string().regex(/^[A-Za-z0-9+/]{43}=$/)
