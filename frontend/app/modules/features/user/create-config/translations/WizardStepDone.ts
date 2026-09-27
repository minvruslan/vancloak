import type { DeviceType } from "@vancloak/api-contract"
import type { WizardAppId } from "../types/WizardAppId"

type InstructionMessages = Record<
  DeviceType["code"],
  Partial<Record<WizardAppId, { steps: string[] }>>
>

export const messages = {
  ru: {
    title: "Конфигурация создана",
    linkAriaLabel: "Ссылка для настройки",
    downloadAction: "Скачать файл",
    copyAction: "Скопировать ссылку",
    setupTitle: "Настройте {name}",
    doneAction: "Готово",
    notifications: {
      copied: "Ссылка скопирована",
      copyError: "Не удалось скопировать ссылку.",
    },
    apps: {
      ios: {
        defaultvpn: {
          steps: [
            "Нажмите «Скопировать ссылку» выше.",
            "В приложении нажмите кнопку «+».",
            "Вставьте скопированную ссылку в поле «Ключ» и нажмите «Добавить».",
            "Нажмите «Connect» и дайте согласие на все запрашиваемые разрешения.",
          ],
        },
      },
      ipados: {
        defaultvpn: {
          steps: [
            "Нажмите «Скопировать ссылку» выше.",
            "В приложении нажмите кнопку «+».",
            "Вставьте скопированную ссылку в поле «Ключ» и нажмите «Добавить».",
            "Нажмите «Connect» и дайте согласие на все запрашиваемые разрешения.",
          ],
        },
      },
      macos: {
        amneziawg: {
          steps: [
            "Нажмите «Скачать файл» выше.",
            "В приложении AmneziaWG нажмите «+» слева внизу.",
            "Выберите «Import Tunnel(s) from File».",
            "Выберите ранее скачанный файл с конфигурацией.",
            "После добавления нажмите «Activate».",
          ],
        },
      },
      windows: {
        amneziavpn: {
          steps: [
            "Нажмите «Скопировать ссылку» выше.",
            "В приложении нажмите «+» в нижнем меню.",
            "Вставьте скопированную ссылку в поле «Вставьте ключ» и нажмите «Продолжить».",
            "Нажмите «Connect».",
          ],
        },
      },
      android: {
        amneziavpn: {
          steps: [
            "Нажмите «Скопировать ссылку» выше.",
            "В приложении нажмите «+» в нижнем меню.",
            "Вставьте скопированную ссылку в поле «Вставьте ключ» и нажмите «Продолжить».",
            "Нажмите «Connect» и дайте согласие на все запрашиваемые разрешения.",
          ],
        },
      },
    } satisfies InstructionMessages,
  },
  en: {
    title: "Configuration created",
    linkAriaLabel: "Setup link",
    downloadAction: "Download file",
    copyAction: "Copy link",
    setupTitle: "Set up {name}",
    doneAction: "Done",
    notifications: {
      copied: "Link copied",
      copyError: "Could not copy the link.",
    },
    apps: {
      ios: {
        defaultvpn: {
          steps: [
            "Tap “Copy link” above.",
            "In the app, tap the “+” button.",
            "Paste the copied link into the “Key” field and tap “Add”.",
            "Tap “Connect” and allow all requested permissions.",
          ],
        },
      },
      ipados: {
        defaultvpn: {
          steps: [
            "Tap “Copy link” above.",
            "In the app, tap the “+” button.",
            "Paste the copied link into the “Key” field and tap “Add”.",
            "Tap “Connect” and allow all requested permissions.",
          ],
        },
      },
      macos: {
        amneziawg: {
          steps: [
            "Click “Download file” above.",
            "In AmneziaWG, click “+” in the bottom-left corner.",
            "Choose “Import Tunnel(s) from File”.",
            "Pick the configuration file you downloaded.",
            "Once it is added, click “Activate”.",
          ],
        },
      },
      windows: {
        amneziavpn: {
          steps: [
            "Click “Copy link” above.",
            "In the app, click “+” in the bottom menu.",
            "Paste the copied link into the “Insert key” field and click “Continue”.",
            "Click “Connect”.",
          ],
        },
      },
      android: {
        amneziavpn: {
          steps: [
            "Tap “Copy link” above.",
            "In the app, tap “+” in the bottom menu.",
            "Paste the copied link into the “Insert key” field and tap “Continue”.",
            "Tap “Connect” and allow all requested permissions.",
          ],
        },
      },
    } satisfies InstructionMessages,
  },
}
