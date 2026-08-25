import { and, eq, gt, or, sql } from "drizzle-orm"
import { config } from "@/core/database/schemas/domainSchema.js"
import { PendingConfigReservationMinutes } from "../constants/PendingConfigReservationMinutes.js"

export function reservedConfigCondition() {
  return or(
    eq(config.status, "active"),
    and(
      eq(config.status, "pending"),
      gt(
        config.createdAt,
        sql`(now() at time zone 'utc') - make_interval(mins => ${PendingConfigReservationMinutes})`,
      ),
    ),
  )
}
