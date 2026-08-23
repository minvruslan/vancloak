import { z } from "zod"
import { ConfigDataSchema } from "@vancloak/infrastructure/shared"
import { DeviceTypeSchema } from "../device-type/DeviceTypeSchema"
import { EndpointSchema } from "../endpoint/EndpointSchema"
import { ConfigStatusSchema } from "./ConfigStatusSchema"

export const ConfigSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  deviceType: DeviceTypeSchema,
  endpoint: EndpointSchema,
  data: ConfigDataSchema,
  status: ConfigStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
