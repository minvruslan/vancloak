import { eq } from "drizzle-orm"
import type { EndpointData } from "@vancloak/infrastructure/shared"
import { db } from "@/core/database/index.js"
import { endpointPlacement } from "@/core/database/schemas/domainSchema.js"

export async function updatePlacementData(placementId: string, data: EndpointData) {
  await db.update(endpointPlacement).set({ data }).where(eq(endpointPlacement.id, placementId))
}
