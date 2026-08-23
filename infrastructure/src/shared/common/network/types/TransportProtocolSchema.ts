import { z } from "zod"

export const TransportProtocolSchema = z.enum(["udp", "tcp"])
