import { sql } from "drizzle-orm"
import { endpoint, endpointPlacement } from "@/core/database/schemas/domainSchema.js"

export function primaryPlacementCondition() {
  return sql`${endpointPlacement.id} = (select "p"."id" from "endpoint_placement" "p" where "p"."endpoint_id" = ${endpoint.id} order by "p"."created_at", "p"."id" limit 1)`
}
