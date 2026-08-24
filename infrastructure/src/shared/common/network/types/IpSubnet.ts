import type { z } from "zod"
import type { IpSubnetSchema } from "./IpSubnetSchema"

export type IpSubnet = z.infer<typeof IpSubnetSchema>
