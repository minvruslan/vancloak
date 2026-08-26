export const messages = {
  ru: {
    title: "Параметры обфускации",
    fields: {
      protocolProfile: {
        label: "Профиль протокола",
        options: { quic_initial: "QUIC Initial" },
      },
      browserFingerprint: {
        label: "Отпечаток браузера",
        options: {
          none: "Без отпечатка",
          chrome: "Chrome",
          edge: "Edge",
          firefox: "Firefox",
          safari: "Safari",
        },
      },
      junkPacketCount: {
        label: "Количество мусорных пакетов",
        options: { low: "Низкое", medium: "Среднее", high: "Высокое" },
      },
      junkPacketSize: {
        label: "Размер мусорных пакетов",
        options: { low: "Небольшой", medium: "Средний", high: "Большой" },
      },
      noisePackets: {
        label: "Шумовые пакеты",
        options: {
          none: "Отключены",
          low: "Низкая интенсивность",
          medium: "Средняя интенсивность",
          high: "Высокая интенсивность",
        },
      },
    },
  },
  en: {
    title: "Obfuscation parameters",
    fields: {
      protocolProfile: {
        label: "Protocol profile",
        options: { quic_initial: "QUIC Initial" },
      },
      browserFingerprint: {
        label: "Browser fingerprint",
        options: {
          none: "No fingerprint",
          chrome: "Chrome",
          edge: "Edge",
          firefox: "Firefox",
          safari: "Safari",
        },
      },
      junkPacketCount: {
        label: "Junk packet count",
        options: { low: "Low", medium: "Medium", high: "High" },
      },
      junkPacketSize: {
        label: "Junk packet size",
        options: { low: "Small", medium: "Medium", high: "Large" },
      },
      noisePackets: {
        label: "Noise packets",
        options: {
          none: "Disabled",
          low: "Low intensity",
          medium: "Medium intensity",
          high: "High intensity",
        },
      },
    },
  },
}
