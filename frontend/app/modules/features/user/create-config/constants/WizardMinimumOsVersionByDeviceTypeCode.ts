import type { DeviceType } from "@vancloak/api-contract"

export const WizardMinimumOsVersionByDeviceTypeCode: Record<DeviceType["code"], string> = {
  ios: "iOS 16+",
  ipados: "iPadOS 16+",
  macos: "macOS 12+",
  windows: "Windows 10+",
  android: "Android 11+",
}
