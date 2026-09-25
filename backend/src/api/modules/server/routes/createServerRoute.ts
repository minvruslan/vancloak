import { authorized } from "@/api/orpc/index.js"
import { createServerService } from "../services/createServerService.js"

const createServerRoute = authorized.servers.createServer.handler(async ({ input, errors }) => {
  const result = await createServerService(input)
  if (!result.ok) {
    switch (result.errorCode) {
      case "enqueue_failed":
        throw errors.ENQUEUE_FAILED({ cause: result.error })
      case "credentials_required":
        throw errors.CREDENTIALS_REQUIRED({ cause: result.error })
      case "duplicate_protocol":
        throw errors.DUPLICATE_PROTOCOL({ cause: result.error })
      case "duplicate_port":
        throw errors.DUPLICATE_PORT({ cause: result.error })
      case "protocol_not_found":
        throw errors.PROTOCOL_NOT_FOUND({ cause: result.error })
      case "unsupported_protocol":
        throw errors.UNSUPPORTED_PROTOCOL({ cause: result.error })
      /* v8 ignore next 2 */
      default:
        return result.errorCode satisfies never
    }
  }
  return result.data.server
})

export { createServerRoute }
