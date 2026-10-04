import type { DeviceType } from "@vancloak/api-contract"
import type { WizardApp } from "../types/WizardApp"

export const WizardAppsByDeviceTypeCode: Record<DeviceType["code"], WizardApp[]> = {
  ios: [
    {
      id: "defaultvpn",
      name: "DefaultVPN",
      iconUrl: "/images/apps/defaultvpn/icon.jpg",
      installSource: "store",
      installUrl: "https://apps.apple.com/app/defaultvpn/id6744725017",
    },
  ],
  ipados: [
    {
      id: "defaultvpn",
      name: "DefaultVPN",
      iconUrl: "/images/apps/defaultvpn/icon.jpg",
      installSource: "store",
      installUrl: "https://apps.apple.com/app/defaultvpn/id6744725017",
    },
  ],
  macos: [
    {
      id: "amneziawg",
      name: "AmneziaWG",
      iconUrl: "/images/apps/amneziawg/icon.jpg",
      installSource: "store",
      installUrl: "https://apps.apple.com/app/amneziawg/id6478942365",
    },
  ],
  windows: [
    {
      id: "amneziavpn",
      name: "AmneziaVPN",
      iconUrl: "/images/apps/amneziavpn/icon.jpg",
      installSource: "website",
      installUrl: "https://storage.googleapis.com/amnezia/amnezia.org",
    },
  ],
  android: [
    {
      id: "amneziavpn",
      name: "AmneziaVPN",
      iconUrl: "/images/apps/amneziavpn/icon.jpg",
      installSource: "website",
      installUrl: "https://storage.googleapis.com/amnezia/amnezia.org",
    },
  ],
}
