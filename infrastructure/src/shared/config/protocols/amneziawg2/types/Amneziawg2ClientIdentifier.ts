import type { z } from "zod"
import type { Amneziawg2ClientIdentifierSchema } from "./Amneziawg2ClientIdentifierSchema"

export type Amneziawg2ClientIdentifier = z.infer<typeof Amneziawg2ClientIdentifierSchema>
