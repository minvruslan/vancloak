import { oc, adminAccess } from "../orpc"
import { z } from "zod"
import { ServerSchema } from "./ServerSchema"
import { UpsertServerSchema } from "./UpsertServerSchema"

export const ServerContract = oc.prefix("/servers").router({
  getServers: adminAccess.route({ method: "GET", path: "/" }).output(z.array(ServerSchema)),
  getServer: adminAccess
    .route({ method: "GET", path: "/{id}" })
    .input(z.object({ id: z.uuid() }))
    .errors({
      NOT_FOUND: { message: "Server not found" },
    })
    .output(ServerSchema),
  createServer: adminAccess
    .route({ method: "POST", path: "/", successStatus: 201 })
    .input(UpsertServerSchema)
    .errors({
      ENQUEUE_FAILED: { status: 502, message: "Failed to enqueue server provisioning" },
      CREDENTIALS_REQUIRED: {
        status: 400,
        message: "Server credentials (username/password) are required",
      },
      DUPLICATE_PROTOCOL: {
        status: 409,
        message: "Multiple endpoints of the same protocol are not supported",
      },
      DUPLICATE_PORT: {
        status: 409,
        message: "Multiple endpoints on the same port are not supported",
      },
      PROTOCOL_NOT_FOUND: { status: 400, message: "Protocol not found" },
      UNSUPPORTED_PROTOCOL: { status: 400, message: "Unsupported protocol" },
    })
    .output(ServerSchema),
})
