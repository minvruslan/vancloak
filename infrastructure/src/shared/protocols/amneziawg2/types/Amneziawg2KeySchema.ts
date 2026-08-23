import { z } from "zod"

export const Amneziawg2KeySchema = z.string().regex(/^[A-Za-z0-9+/]{43}=$/)
