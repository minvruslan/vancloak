import type { DeviceType } from "@vancloak/api-contract"
import { messages } from "../translations/DeviceTypeName"

export function useDeviceTypeName() {
  const { t } = useI18n({ useScope: "local", messages })
  return (code: DeviceType["code"]) => t(code)
}
