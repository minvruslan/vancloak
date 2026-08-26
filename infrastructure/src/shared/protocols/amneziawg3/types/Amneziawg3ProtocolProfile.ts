import type { z } from "zod"
import type { Amneziawg3ProtocolProfileSchema } from "./Amneziawg3ProtocolProfileSchema"

export type Amneziawg3ProtocolProfile = z.infer<typeof Amneziawg3ProtocolProfileSchema>
