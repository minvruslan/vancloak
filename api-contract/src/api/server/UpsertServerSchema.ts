import { z } from "zod"
import { CountryCodeSchema } from "../../core/country-code/CountryCodeSchema"
import { DomainNameSchema } from "@vancloak/infrastructure/shared"
import { IpSchema } from "@vancloak/infrastructure/shared"
import { UpsertServerEndpointSchema } from "./UpsertServerEndpointSchema"
import { ServerCredentialsSchema } from "./ServerCredentialsSchema"

export const UpsertServerSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(15)
    .regex(
      /^[a-zA-Z0-9_=+.-]+$/,
      "Server name must contain only latin letters, digits, and _=+.- characters",
    ),
  domainName: DomainNameSchema.optional(),
  ip: IpSchema,
  country: CountryCodeSchema,
  endpoints: UpsertServerEndpointSchema.array().optional(),
  credentials: ServerCredentialsSchema.optional(),
})
