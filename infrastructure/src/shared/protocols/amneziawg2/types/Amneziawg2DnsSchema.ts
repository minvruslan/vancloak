import { z } from "zod"
import { IpSchema } from "../../../common/network/types/IpSchema"

export const Amneziawg2DnsSchema = z
  .string()
  .min(1)
  .refine((value) => value.split(",").every((entry) => IpSchema.safeParse(entry.trim()).success), {
    message: "DNS must be a comma-separated list of IP addresses",
  })
