import type { ApiClient } from "@vancloak/api-contract"

export type DemoApiClient = Pick<
  ApiClient,
  "configs" | "configLimits" | "deviceTypes" | "endpoints"
>
