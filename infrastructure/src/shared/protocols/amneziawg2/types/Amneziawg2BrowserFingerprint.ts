import type { z } from "zod"
import type { Amneziawg2BrowserFingerprintSchema } from "./Amneziawg2BrowserFingerprintSchema"

export type Amneziawg2BrowserFingerprint = z.infer<typeof Amneziawg2BrowserFingerprintSchema>
