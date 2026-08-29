export const messages = {
  ru: {
    title: "Установите {name}",
    steps: {
      macos: {
        download: "Скачайте {name} для {os} с официального сайта, нажав кнопку «Скачать»:",
        downloadLinkLabel: "amnezia.org/ru/downloads",
        downloadLinkUrl: "https://amnezia.org/ru/downloads",
        mirror:
          "Если первая ссылка не открывается, используйте запасную. Откройте в меню пункт «Скачать» и нажмите кнопку «Скачать»:",
        mirrorLinkLabel: "storage.googleapis.com/amnezia/amnezia.org",
        mirrorLinkUrl: "https://storage.googleapis.com/amnezia/amnezia.org",
        open: "Дважды кликните по скачанному файлу, чтобы запустить установщик.",
        install: "Пройдите все шаги установщика. При запросе введите пароль администратора.",
      },
      windows: {
        download:
          "Скачайте {name} для {os}. На сайте откройте в меню пункт «Скачать» и нажмите кнопку «Скачать»:",
        downloadLinkLabel: "storage.googleapis.com/amnezia/amnezia.org",
        downloadLinkUrl: "https://storage.googleapis.com/amnezia/amnezia.org",
        open: "Дважды кликните по скачанному файлу, чтобы запустить установщик.",
        install:
          "Пройдите все шаги установщика. После нажатия кнопки «Установить» появится окно «Контроль учётных записей», в нём нажмите «Да».",
      },
      android: {
        download: "Скачайте {name} для {os}. На сайте откройте в меню пункт «Скачать»:",
        downloadLinkLabel: "storage.googleapis.com/amnezia/amnezia.org",
        downloadLinkUrl: "https://storage.googleapis.com/amnezia/amnezia.org",
        instructions: "Нажмите кнопку «Инструкции по установке APK» и ознакомьтесь с ними.",
        pick: "Затем нажмите кнопку «Скачать APK». Файлы для скачивания находятся внизу открывшейся страницы.",
      },
    },
    installedAction: "Я установил {name}",
  },
  en: {
    title: "Install {name}",
    steps: {
      macos: {
        download:
          "Download {name} for {os} from the official website by pressing the “Download” button:",
        downloadLinkLabel: "amnezia.org/downloads",
        downloadLinkUrl: "https://amnezia.org/downloads",
        mirror:
          "If the first link does not open, use the backup one. Open the “Download” menu item and press the “Download” button:",
        mirrorLinkLabel: "storage.googleapis.com/amnezia/amnezia.org",
        mirrorLinkUrl: "https://storage.googleapis.com/amnezia/amnezia.org",
        open: "Double-click the downloaded file to launch the installer.",
        install: "Complete all installer steps. Enter your administrator password when prompted.",
      },
      windows: {
        download:
          "Download {name} for {os}. On the website, open the “Download” menu item and press the “Download” button:",
        downloadLinkLabel: "storage.googleapis.com/amnezia/amnezia.org",
        downloadLinkUrl: "https://storage.googleapis.com/amnezia/amnezia.org",
        open: "Double-click the downloaded file to launch the installer.",
        install:
          "Complete all installer steps. After clicking “Install”, a User Account Control window will appear. Click “Yes” in it.",
      },
      android: {
        download: "Download {name} for {os}. On the website, open the “Download” menu item:",
        downloadLinkLabel: "storage.googleapis.com/amnezia/amnezia.org",
        downloadLinkUrl: "https://storage.googleapis.com/amnezia/amnezia.org",
        instructions: "Press the “APK installation instructions” button and read them.",
        pick: "Then press the “Download APK” button. The files are at the bottom of the opened page.",
      },
    },
    installedAction: "I installed {name}",
  },
}
