import type { z } from "zod"
import type { Amneziawg3ClientIdentifierSchema } from "./Amneziawg3ClientIdentifierSchema"

export type Amneziawg3ClientIdentifier = z.infer<typeof Amneziawg3ClientIdentifierSchema>
