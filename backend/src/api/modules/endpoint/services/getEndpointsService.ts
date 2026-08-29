import type { Endpoint } from "@vancloak/api-contract"
import { db } from "@/core/database/index.js"
import type { ServiceResult } from "@/core/types/index.js"
import { findActiveEndpoints } from "../queries/findActiveEndpoints.js"
import { createEndpointFromDatabaseData } from "../utils/createEndpointFromDatabaseData.js"

export async function getEndpointsService(): Promise<
  ServiceResult<{ endpoints: (Endpoint & { isRecommended: boolean })[] }>
> {
  const rows = await findActiveEndpoints(db)
  return {
    ok: true,
    data: {
      endpoints: rows.map((row, index) => ({
        ...createEndpointFromDatabaseData(row),
        isRecommended: index === 0,
      })),
    },
  }
}
