import { getEndpointsRoute } from "./routes/getEndpointsRoute.js"

const endpointRouter = {
  getEndpoints: getEndpointsRoute,
}

export { endpointRouter }
export { primaryPlacementCondition } from "./queries/conditions/primaryPlacementCondition.js"
