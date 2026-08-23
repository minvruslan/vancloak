import { z } from "zod"

export const Amneziawg2BrowserFingerprintSchema = z.enum(["chrome", "edge", "firefox", "safari"])
