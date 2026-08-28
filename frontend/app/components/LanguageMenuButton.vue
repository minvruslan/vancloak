<script setup lang="ts">
import { Globe } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { messages } from "@/translations/LanguageSwitcher"

type LocaleCode = "ru" | "en"

const { t } = useI18n({ useScope: "local", messages })
const { locale, locales, setLocale } = useI18n()

const onSelect = (code: string) => {
  if (code !== locale.value) setLocale(code as LocaleCode)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button type="button" variant="ghost" size="icon">
        <Globe class="size-4 text-muted-foreground" aria-hidden="true" />
        <span class="sr-only">{{ t("languageLabel") }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem v-for="l in locales" :key="l.code" @select="onSelect(l.code)">
        {{ l.name }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
