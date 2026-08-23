import { z } from "zod"
import { CountryCodeSchema } from "../../core/country-code/CountryCodeSchema"
import { DomainNameSchema } from "@vancloak/infrastructure/shared"
import { IpSchema } from "@vancloak/infrastructure/shared"
import { ServerEndpointSchema } from "./ServerEndpointSchema"
import { ServerStatusSchema } from "./ServerStatusSchema"

export const ServerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  domainName: DomainNameSchema.nullable(),
  ip: IpSchema,
  country: CountryCodeSchema,
  status: ServerStatusSchema,
  isCurrent: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  endpoints: ServerEndpointSchema.array(),
})
