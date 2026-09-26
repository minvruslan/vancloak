import type { z } from "zod"
import type { SplitTunnelingSchema } from "./SplitTunnelingSchema"

export type SplitTunneling = z.infer<typeof SplitTunnelingSchema>
