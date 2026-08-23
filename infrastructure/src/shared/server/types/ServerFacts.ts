import type { z } from "zod"
import type { ServerFactsSchema } from "./ServerFactsSchema"

export type ServerFacts = z.infer<typeof ServerFactsSchema>
