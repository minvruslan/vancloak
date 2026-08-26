import type { z } from "zod"
import type { Amneziawg3ServerObfuscationSchema } from "./Amneziawg3ServerObfuscationSchema"

export type Amneziawg3ServerObfuscation = z.infer<typeof Amneziawg3ServerObfuscationSchema>
