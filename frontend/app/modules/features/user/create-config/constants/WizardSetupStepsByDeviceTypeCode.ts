import type { DeviceType } from "@vancloak/api-contract"
import type { WizardAppId } from "../types/WizardAppId"
import type { WizardSetupStep } from "../types/WizardSetupStep"

export const WizardSetupStepsByDeviceTypeCode = {
  ios: {
    defaultvpn: [
      { id: "copyLink", screenshotUrl: null },
      { id: "openApp", screenshotUrl: "/images/setup/ios/defaultvpn/plus.png" },
      { id: "paste", screenshotUrl: "/images/setup/ios/defaultvpn/paste.png" },
      { id: "connect", screenshotUrl: null },
    ],
  },
  ipados: {
    defaultvpn: [
      { id: "copyLink", screenshotUrl: null },
      { id: "openApp", screenshotUrl: "/images/setup/ipados/defaultvpn/plus.png" },
      { id: "paste", screenshotUrl: "/images/setup/ipados/defaultvpn/paste.png" },
      { id: "connect", screenshotUrl: null },
    ],
  },
  macos: {
    amneziawg: [
      { id: "downloadFile", screenshotUrl: null },
      { id: "import", screenshotUrl: "/images/setup/macos/amneziawg/import.png" },
      { id: "pickFile", screenshotUrl: null },
      { id: "activate", screenshotUrl: "/images/setup/macos/amneziawg/activate.png" },
      { id: "menuBar", screenshotUrl: "/images/setup/macos/amneziawg/menubar.png" },
    ],
  },
  windows: {
    amneziavpn: [
      { id: "copyLink", screenshotUrl: null },
      { id: "openApp", screenshotUrl: "/images/setup/windows/amneziavpn/plus.png" },
      { id: "paste", screenshotUrl: "/images/setup/windows/amneziavpn/key.png" },
      { id: "warning", screenshotUrl: null },
      { id: "connect", screenshotUrl: null },
    ],
  },
  android: {
    amneziavpn: [
      { id: "copyLink", screenshotUrl: null },
      { id: "openApp", screenshotUrl: "/images/setup/android/amneziavpn/plus.png" },
      { id: "paste", screenshotUrl: "/images/setup/android/amneziavpn/key.png" },
      { id: "warning", screenshotUrl: null },
      { id: "connect", screenshotUrl: null },
    ],
  },
} as const satisfies Record<DeviceType["code"], Partial<Record<WizardAppId, WizardSetupStep[]>>>
