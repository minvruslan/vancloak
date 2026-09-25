import type { ConfigProtocolFields } from "@vancloak/api-contract"
import type { DbOrTx } from "@/core/database/index.js"
import { config } from "@/core/database/schemas/domainSchema.js"

type ConfigFields = {
  userId: string
  endpointId: string
  placementId: string
  deviceTypeId: string
  name: string
  host: string
} & ConfigProtocolFields

export async function insertUserConfig(executor: DbOrTx, fields: ConfigFields) {
  return executor.insert(config).values(fields).returning({ id: config.id })
}
