import type { z } from "zod"
import type { Amneziawg2ServerObfuscationSchema } from "./Amneziawg2ServerObfuscationSchema"

export type Amneziawg2ServerObfuscation = z.infer<typeof Amneziawg2ServerObfuscationSchema>
