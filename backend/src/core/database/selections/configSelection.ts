import { config, deviceType, endpoint, protocol, server } from "../schemas/domainSchema.js"

export const configSelection = {
  id: config.id,
  name: config.name,
  data: config.data,
  status: config.status,
  createdAt: config.createdAt,
  updatedAt: config.updatedAt,
  deviceTypeId: deviceType.id,
  deviceTypeCode: deviceType.code,
  deviceTypeName: deviceType.name,
  endpointId: endpoint.id,
  endpointPort: endpoint.port,
  endpointHost: endpoint.host,
  protocolId: protocol.id,
  protocolCode: protocol.code,
  protocolFamily: protocol.family,
  protocolName: protocol.name,
  serverId: server.id,
  serverName: server.name,
  serverCountry: server.country,
}
