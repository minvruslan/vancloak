import type { z } from "zod"
import type { Amneziawg3BrowserFingerprintSchema } from "./Amneziawg3BrowserFingerprintSchema"

export type Amneziawg3BrowserFingerprint = z.infer<typeof Amneziawg3BrowserFingerprintSchema>
