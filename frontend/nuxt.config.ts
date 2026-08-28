import tailwindcss from "@tailwindcss/vite"

const devApiProxyTarget = process.env.DEV_API_PROXY_TARGET

export default defineNuxtConfig({
  app: {
    head: {
      title: "VanCloak",
      meta: [{ name: "description", content: "VanCloak" }],
      link: [
        { rel: "icon", href: "/favicon.ico?v=5", sizes: "any" },
        { rel: "icon", type: "image/svg+xml", href: "/icon.svg?v=3" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=3" },
      ],
    },
  },
  build: {
    transpile: ["@vancloak/api-contract"],
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: "",
      authBaseUrl: "",
    },
  },
  routeRules: {
    "/": { redirect: "/login" },
  },
  nitro: {
    devProxy: {
      "/api": {
        target: devApiProxyTarget ?? "http://localhost:4000/api",
        changeOrigin: true,
        ...(devApiProxyTarget ? { headers: { origin: new URL(devApiProxyTarget).origin } } : {}),
      },
    },
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/tailwind.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  modules: ["shadcn-nuxt", "@nuxt/eslint", "@nuxtjs/i18n", "@nuxt/fonts", "@nuxtjs/color-mode"],
  colorMode: {
    classSuffix: "",
    fallback: "light",
  },
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
      subsets: ["latin", "cyrillic"],
    },
    experimental: {
      processCSSVariables: true,
    },
  },
  shadcn: {
    prefix: "",
    componentDir: "@/components/ui",
  },
  i18n: {
    restructureDir: "app/i18n",
    strategy: "no_prefix",
    defaultLocale: "ru",
    locales: [
      { code: "ru", language: "ru-RU", name: "Русский" },
      { code: "en", language: "en-US", name: "English" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_locale",
      redirectOn: "root",
      fallbackLocale: "ru",
    },
    vueI18n: "i18n.config.ts",
  },
  dir: {
    middleware: "middlewares",
  },
})
