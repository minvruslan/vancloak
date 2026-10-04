import type { WizardSetupStepsByDeviceTypeCode } from "../constants/WizardSetupStepsByDeviceTypeCode"

type SetupSteps = typeof WizardSetupStepsByDeviceTypeCode

type SetupStepId<Steps> = Steps extends readonly { id: infer Id extends string }[] ? Id : never

type InstructionMessages = {
  [Code in keyof SetupSteps]: {
    [AppId in keyof SetupSteps[Code]]: {
      steps: Record<SetupStepId<SetupSteps[Code][AppId]>, string>
    }
  }
}

export const messages = {
  ru: {
    title: "Конфигурация создана",
    linkAriaLabel: "Ссылка для настройки",
    downloadAction: "Скачать файл",
    copyAction: "Скопировать ссылку",
    showScreenshotAction: "Показать, где нажать.",
    hideScreenshotAction: "Скрыть.",
    doneAction: "Готово",
    notifications: {
      copied: "Ссылка скопирована",
      copyError: "Не удалось скопировать ссылку.",
    },
    apps: {
      ios: {
        defaultvpn: {
          steps: {
            copyLink: "Нажмите «Скопировать ссылку» выше.",
            openApp: "Откройте приложение DefaultVPN и нажмите кнопку «+».",
            paste:
              "Нажмите «Вставить» и разрешите вставку в диалоговом окне. Далее нажмите «Добавить».",
            connect:
              "Нажмите «Подключиться» на главном экране приложения и дайте запрашиваемые разрешения.",
          },
        },
      },
      ipados: {
        defaultvpn: {
          steps: {
            copyLink: "Нажмите «Скопировать ссылку» выше.",
            openApp: "Откройте приложение DefaultVPN и нажмите кнопку «+».",
            paste:
              "Нажмите «Вставить» и разрешите вставку в диалоговом окне. Далее нажмите «Добавить».",
            connect:
              "Нажмите «Подключиться» на главном экране приложения и дайте запрашиваемые разрешения.",
          },
        },
      },
      macos: {
        amneziawg: {
          steps: {
            downloadFile: "Нажмите «Скачать файл» выше.",
            import:
              "Откройте приложение AmneziaWG, нажмите «+» слева внизу и выберите «Импорт туннелей из файла».",
            pickFile: "Выберите ранее скачанный файл с конфигурацией и нажмите «Импорт».",
            activate: "После добавления нажмите «Подключен».",
            menuBar:
              "AmneziaWG живёт в строке меню macOS: нажмите на его иконку и выберите туннель, чтобы быстро включить или выключить VPN.",
          },
        },
      },
      windows: {
        amneziavpn: {
          steps: {
            copyLink: "Нажмите «Скопировать ссылку» выше.",
            openApp: "Откройте приложение AmneziaVPN и нажмите «+» в нижнем меню.",
            paste: "Вставьте скопированную ссылку в поле «Вставьте ключ» и нажмите «Продолжить».",
            warning: "Нажмите «Подключиться» на экране с предупреждением.",
            connect: "Нажмите «Подключиться» на главном экране приложения.",
          },
        },
      },
      android: {
        amneziavpn: {
          steps: {
            copyLink: "Нажмите «Скопировать ссылку» выше.",
            openApp: "Откройте приложение AmneziaVPN и нажмите «+» в нижнем меню.",
            paste: "Вставьте скопированную ссылку в поле «Вставьте ключ» и нажмите «Продолжить».",
            warning: "Нажмите «Подключиться» на экране с предупреждением.",
            connect:
              "Нажмите «Подключиться» на главном экране приложения и дайте запрашиваемые разрешения.",
          },
        },
      },
    } satisfies InstructionMessages,
  },
  en: {
    title: "Configuration created",
    linkAriaLabel: "Setup link",
    downloadAction: "Download file",
    copyAction: "Copy link",
    showScreenshotAction: "Show where to tap.",
    hideScreenshotAction: "Hide.",
    doneAction: "Done",
    notifications: {
      copied: "Link copied",
      copyError: "Could not copy the link.",
    },
    apps: {
      ios: {
        defaultvpn: {
          steps: {
            copyLink: "Tap “Copy link” above.",
            openApp: "Open the DefaultVPN app and tap the “+” button.",
            paste: "Tap “Insert” and allow pasting in the dialog. Then tap “Add”.",
            connect: "Tap “Connect” on the app’s main screen and grant the requested permissions.",
          },
        },
      },
      ipados: {
        defaultvpn: {
          steps: {
            copyLink: "Tap “Copy link” above.",
            openApp: "Open the DefaultVPN app and tap the “+” button.",
            paste: "Tap “Insert” and allow pasting in the dialog. Then tap “Add”.",
            connect: "Tap “Connect” on the app’s main screen and grant the requested permissions.",
          },
        },
      },
      macos: {
        amneziawg: {
          steps: {
            downloadFile: "Click “Download file” above.",
            import:
              "Open the AmneziaWG app, click “+” in the bottom-left corner and choose “Import Tunnel(s) from File”.",
            pickFile: "Pick the configuration file you downloaded and click “Import”.",
            activate: "Once it is added, click “Activate”.",
            menuBar:
              "AmneziaWG lives in the macOS menu bar: click its icon and pick the tunnel to quickly turn the VPN on or off.",
          },
        },
      },
      windows: {
        amneziavpn: {
          steps: {
            copyLink: "Click “Copy link” above.",
            openApp: "Open the AmneziaVPN app and click “+” in the bottom menu.",
            paste: "Paste the copied link into the “Insert key” field and click “Continue”.",
            warning: "Click “Connect” on the warning screen.",
            connect: "Click “Connect” on the app’s main screen.",
          },
        },
      },
      android: {
        amneziavpn: {
          steps: {
            copyLink: "Tap “Copy link” above.",
            openApp: "Open the AmneziaVPN app and tap “+” in the bottom menu.",
            paste: "Paste the copied link into the “Insert key” field and tap “Continue”.",
            warning: "Tap “Connect” on the warning screen.",
            connect: "Tap “Connect” on the app’s main screen and grant the requested permissions.",
          },
        },
      },
    } satisfies InstructionMessages,
  },
}
