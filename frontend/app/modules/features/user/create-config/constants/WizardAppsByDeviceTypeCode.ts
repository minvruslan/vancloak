import type { DeviceType } from "@vancloak/api-contract"
import type { WizardApp } from "../types/WizardApp"

export const WizardAppsByDeviceTypeCode: Record<DeviceType["code"], WizardApp[]> = {
  ios: [
    {
      id: "defaultvpn",
      name: "DefaultVPN",
      iconUrl: "/images/apps/defaultvpn.jpg",
      downloadUrl: "https://apps.apple.com/us/app/defaultvpn/id6744725017",
    },
    {
      id: "amneziavpn",
      name: "AmneziaVPN",
      iconUrl: "/images/apps/amneziavpn.jpg",
      downloadUrl: "https://apps.apple.com/app/amneziavpn/id1600529900",
    },
    {
      id: "amneziawg",
      name: "AmneziaWG",
      iconUrl: "/images/apps/amneziawg.jpg",
      downloadUrl: "https://apps.apple.com/app/amneziawg/id6478942365",
    },
  ],
  ipados: [
    {
      id: "defaultvpn",
      name: "DefaultVPN",
      iconUrl: "/images/apps/defaultvpn.jpg",
      downloadUrl: "https://apps.apple.com/us/app/defaultvpn/id6744725017",
    },
    {
      id: "amneziavpn",
      name: "AmneziaVPN",
      iconUrl: "/images/apps/amneziavpn.jpg",
      downloadUrl: "https://apps.apple.com/app/amneziavpn/id1600529900",
    },
    {
      id: "amneziawg",
      name: "AmneziaWG",
      iconUrl: "/images/apps/amneziawg.jpg",
      downloadUrl: "https://apps.apple.com/app/amneziawg/id6478942365",
    },
  ],
  macos: [
    {
      id: "amneziavpn",
      name: "AmneziaVPN",
      iconUrl: "/images/apps/amneziavpn.jpg",
      downloadUrl: "https://amnezia.org/downloads",
    },
  ],
  windows: [
    {
      id: "defaultvpn",
      name: "DefaultVPN",
      iconUrl: "/images/apps/defaultvpn.jpg",
      downloadUrl: "https://www.wireguard.com/install/",
    },
    {
      id: "amneziavpn",
      name: "AmneziaVPN",
      iconUrl: "/images/apps/amneziavpn.jpg",
      downloadUrl: "https://amnezia.org/downloads",
    },
    {
      id: "amneziawg",
      name: "AmneziaWG",
      iconUrl: "/images/apps/amneziawg.jpg",
      downloadUrl: "https://github.com/amnezia-vpn/amneziawg-windows-client/releases",
    },
  ],
  android: [
    {
      id: "defaultvpn",
      name: "DefaultVPN",
      iconUrl: "/images/apps/defaultvpn.jpg",
      downloadUrl: "https://play.google.com/store/apps/details?id=com.wireguard.android",
    },
    {
      id: "amneziavpn",
      name: "AmneziaVPN",
      iconUrl: "/images/apps/amneziavpn.jpg",
      downloadUrl: "https://play.google.com/store/apps/details?id=org.amnezia.vpn",
    },
    {
      id: "amneziawg",
      name: "AmneziaWG",
      iconUrl: "/images/apps/amneziawg.jpg",
      downloadUrl: "https://play.google.com/store/apps/details?id=org.amnezia.awg",
    },
  ],
}
