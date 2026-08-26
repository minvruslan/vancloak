import { z } from "zod"

export const Amneziawg3BrowserFingerprintSchema = z.enum(["chrome", "edge", "firefox", "safari"])
