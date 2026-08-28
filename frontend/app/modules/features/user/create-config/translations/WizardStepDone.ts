import type { DeviceType } from "@vancloak/api-contract"
import type { WizardAppId } from "../types/WizardAppId"

type InstructionMessages = Record<WizardAppId, Record<DeviceType["code"], { steps: string[] }>>

function stepsForAllDeviceTypeCodes(
  steps: string[],
): Record<DeviceType["code"], { steps: string[] }> {
  return {
    ios: { steps },
    ipados: { steps },
    macos: { steps },
    windows: { steps },
    android: { steps },
  }
}

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
      amneziavpn: {
        ...stepsForAllDeviceTypeCodes([
          "Нажмите «Скопировать ссылку» выше.",
          "В приложении нажмите «+» в нижнем меню.",
          "Вставьте скопированную ссылку в поле «Вставьте ключ» и нажмите «Продолжить».",
          "Нажмите «Connect» и дайте согласие на все запрашиваемые разрешения.",
        ]),
        macos: {
          steps: [
            "Нажмите «Скопировать ссылку» выше.",
            "В приложении нажмите «+» в нижнем меню.",
            "Вставьте скопированную ссылку в поле «Вставьте ключ» и нажмите «Продолжить».",
            "Нажмите «Connect» и разрешите добавление конфигураций VPN.",
          ],
        },
      },
      amneziawg: stepsForAllDeviceTypeCodes([
        "Нажмите «Скачать файл» и разрешите загрузку.",
        "Откройте AmneziaWG, нажмите «+» и выберите «Создать из файла или архива».",
        "Выберите скачанный файл.",
        "Если файл из пункта 3 серый и не выбирается — откройте приложение «Файлы», нажмите и удерживайте файл, затем выберите «Поделиться» → AmneziaWG.",
        "Разрешите добавление VPN-конфигурации и включите переключатель рядом с новым туннелем.",
      ]),
      defaultvpn: stepsForAllDeviceTypeCodes([
        "Нажмите «Скопировать ссылку» выше.",
        "В приложении нажмите кнопку «+».",
        "Вставьте скопированную ссылку в поле «Ключ» и нажмите «Добавить».",
        "Нажмите «Connect» и дайте согласие на все запрашиваемые разрешения.",
      ]),
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
      amneziavpn: {
        ...stepsForAllDeviceTypeCodes([
          "Tap “Copy link” above.",
          "In the app, tap “+” in the bottom menu.",
          "Paste the copied link into the “Insert key” field and tap “Continue”.",
          "Tap “Connect” and allow all requested permissions.",
        ]),
        macos: {
          steps: [
            "Click “Copy link” above.",
            "In the app, click “+” in the bottom menu.",
            "Paste the copied link into the “Insert key” field and click “Continue”.",
            "Click “Connect” and allow adding VPN configurations.",
          ],
        },
      },
      amneziawg: stepsForAllDeviceTypeCodes([
        "Tap “Download file” and allow the download.",
        "Open AmneziaWG, tap “+” and choose “Create from file or archive”.",
        "Pick the downloaded file.",
        "If the file from step 3 is greyed out and cannot be selected, open the Files app, press and hold the file, then choose “Share” → AmneziaWG.",
        "Allow adding the VPN configuration, then flip the toggle next to the new tunnel.",
      ]),
      defaultvpn: stepsForAllDeviceTypeCodes([
        "Tap “Copy link” above.",
        "In the app, tap the “+” button.",
        "Paste the copied link into the “Key” field and tap “Add”.",
        "Tap “Connect” and allow all requested permissions.",
      ]),
    } satisfies InstructionMessages,
  },
}
