import type { DeviceType } from "@vancloak/api-contract"

type InstallMessages = Record<
  DeviceType["code"],
  { openAction: string; note?: string; steps?: string[] }
>

export const messages = {
  ru: {
    title: "Установите {name}",
    description:
      "Скачайте приложение из App Store и вернитесь на эту страницу — мы создадим конфигурацию и покажем, как её подключить.",
    downloadStepTitle: "Скачайте установщик",
    installedAction: "Я установил {name}",
    apps: {
      ios: {
        openAction: "Открыть в App Store",
      },
      ipados: {
        openAction: "Открыть в App Store",
      },
      macos: {
        openAction: "Открыть в App Store",
      },
      windows: {
        openAction: "Перейти на сайт",
        note: "На сайте откройте в меню пункт «Скачать» и нажмите кнопку «Скачать».",
        steps: [
          "Дважды кликните по скачанному файлу, чтобы запустить установщик.",
          "После нажатия кнопки «Установить» появится окно «Контроль учётных записей», в нём нажмите «Да».",
          "Пройдите все шаги установщика.",
        ],
      },
      android: {
        openAction: "Перейти на сайт",
        note: "На сайте откройте в меню пункт «Скачать» и нажмите «Скачать APK». Внизу открывшейся страницы скачайте файл с «android11+» и «arm64-v8a» в названии.",
        steps: [
          "Откройте скачанный файл и разрешите установку из этого источника.",
          "Нажмите «Установить» и дождитесь окончания установки.",
        ],
      },
    } satisfies InstallMessages,
  },
  en: {
    title: "Install {name}",
    description:
      "Download the app from the App Store and return to this page — we’ll create the configuration and show you how to connect it.",
    downloadStepTitle: "Download the installer",
    installedAction: "I installed {name}",
    apps: {
      ios: {
        openAction: "Open in the App Store",
      },
      ipados: {
        openAction: "Open in the App Store",
      },
      macos: {
        openAction: "Open in the App Store",
      },
      windows: {
        openAction: "Go to the website",
        note: "On the website, open the “Download” menu item and press the “Download” button.",
        steps: [
          "Double-click the downloaded file to launch the installer.",
          "After clicking “Install”, a User Account Control window will appear. Click “Yes” in it.",
          "Complete all installer steps.",
        ],
      },
      android: {
        openAction: "Go to the website",
        note: "On the website, open the “Download” menu item and press “Download APK”. At the bottom of the opened page, download the file with “android11+” and “arm64-v8a” in its name.",
        steps: [
          "Open the downloaded file and allow installing from this source.",
          "Tap “Install” and wait for the installation to finish.",
        ],
      },
    } satisfies InstallMessages,
  },
}
