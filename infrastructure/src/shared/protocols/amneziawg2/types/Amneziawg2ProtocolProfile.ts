import type { z } from "zod"
import type { Amneziawg2ProtocolProfileSchema } from "./Amneziawg2ProtocolProfileSchema"

export type Amneziawg2ProtocolProfile = z.infer<typeof Amneziawg2ProtocolProfileSchema>
