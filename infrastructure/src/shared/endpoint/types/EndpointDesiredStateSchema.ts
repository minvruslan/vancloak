import { z } from "zod"
import { PortSchema } from "../../common/network/types/PortSchema"
import { ProtocolCodeSchema } from "../../protocols/types/ProtocolCodeSchema"

export const EndpointDesiredStateSchema = z.looseObject({
  protocolCode: ProtocolCodeSchema,
  port: PortSchema,
})
