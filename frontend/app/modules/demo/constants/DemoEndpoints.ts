import {
  ProtocolCodeSchema,
  ProtocolFamilyCodeSchema,
  ProtocolRegistry,
  type Endpoint,
} from "@vancloak/api-contract"

const DemoProtocol = {
  id: "da1e879f-93c2-4c3b-b6aa-213698ae6fd6",
  code: ProtocolCodeSchema.enum.amneziawg3,
  family: ProtocolFamilyCodeSchema.enum.amneziawg,
  name: ProtocolRegistry.amneziawg3.name,
}

export const DemoEndpoints: (Endpoint & { isRecommended: boolean })[] = [
  {
    id: "19a9805e-160b-46b1-95f8-a4d848e576ba",
    port: ProtocolRegistry.amneziawg3.defaultPort,
    host: null,
    protocol: DemoProtocol,
    server: { id: "c07927f4-3a1b-489c-94d2-28e0757c94a8", name: "Amsterdam", country: "NL" },
    isRecommended: true,
  },
  {
    id: "8fd58cac-7e9f-43dd-81d5-78b91801a49e",
    port: ProtocolRegistry.amneziawg3.defaultPort,
    host: null,
    protocol: DemoProtocol,
    server: { id: "9680ace5-6dfb-4ed2-9dcf-81783f16d29c", name: "Frankfurt", country: "DE" },
    isRecommended: false,
  },
  {
    id: "ff25bf59-c272-42eb-8192-24410a48b282",
    port: ProtocolRegistry.amneziawg3.defaultPort,
    host: null,
    protocol: DemoProtocol,
    server: { id: "2e368659-a031-4670-8bb9-cabd2827836d", name: "Stockholm", country: "SE" },
    isRecommended: false,
  },
]
