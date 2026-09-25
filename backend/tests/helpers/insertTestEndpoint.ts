import type { DbOrTx } from "@/core/database/index.js"
import { db } from "@/core/database/index.js"
import { endpoint } from "@/core/database/schemas/index.js"
import type { EndpointData } from "@vancloak/infrastructure/shared"
import { FakeAmneziawg3EndpointActualState } from "./createFakeAmneziawg3Client.js"
import { insertTestEndpointPlacement } from "./insertTestEndpointPlacement.js"

export async function insertTestEndpoint(
  overrides: Partial<typeof endpoint.$inferInsert> &
    Pick<typeof endpoint.$inferInsert, "protocolId"> & { serverId: string },
  executor: DbOrTx = db,
) {
  const { serverId, data, ...endpointValues } = overrides

  const [insertedEndpoint] = await executor
    .insert(endpoint)
    .values({ port: 51820, data: {}, ...endpointValues })
    .returning()

  await insertTestEndpointPlacement(
    {
      endpointId: insertedEndpoint.id,
      serverId,
      data: (data ?? { actualState: FakeAmneziawg3EndpointActualState }) as EndpointData,
    },
    executor,
  )

  return insertedEndpoint
}
