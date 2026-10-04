<script setup lang="ts">
import { computed } from "vue"
import { Copy, ExternalLink } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WizardApp } from "../types/WizardApp"
import { messages } from "../translations/WizardAppLinkCard"

const props = defineProps<{
  app: WizardApp
  minimumOsVersion: string
  openAction: string
  note?: string
  size: "compact" | "large"
}>()

const { t } = useI18n({ useScope: "local", messages })
const { showSuccess, showError } = useNotificationBanner()

const isLarge = computed(() => props.size === "large")
const isLinkCopyable = computed(() => props.app.installSource === "website")

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(props.app.installUrl)
    showSuccess(t("notifications.copied"))
  } catch {
    showError(t("notifications.copyError"))
  }
}
</script>

<template>
  <div class="flex flex-col rounded-lg border" :class="isLarge ? 'gap-4 p-4' : 'gap-3 p-3'">
    <div class="flex items-center gap-3">
      <img
        :src="app.iconUrl"
        :alt="app.name"
        class="shrink-0 rounded-md border"
        :class="isLarge ? 'size-12' : 'size-9'"
      />
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="truncate font-semibold" :class="isLarge ? 'text-base' : 'text-sm'">
          {{ app.name }}
        </span>
        <span class="truncate text-xs text-muted-foreground">{{ minimumOsVersion }}</span>
      </div>
    </div>

    <p v-if="note" class="text-sm leading-relaxed text-muted-foreground">{{ note }}</p>

    <div class="flex flex-col gap-3.5">
      <Input
        v-if="isLinkCopyable"
        :model-value="app.installUrl"
        readonly
        :aria-label="t('linkAriaLabel')"
      />
      <div class="flex flex-col gap-2 sm:flex-row">
        <Button
          v-if="isLinkCopyable"
          type="button"
          variant="outline"
          class="w-full sm:flex-1"
          @click="copyUrl"
        >
          <Copy class="size-4" aria-hidden="true" />
          {{ t("copyAction") }}
        </Button>
        <Button
          as="a"
          :href="app.installUrl"
          target="_blank"
          rel="noopener"
          variant="outline"
          class="w-full sm:flex-1"
        >
          <ExternalLink class="size-4" aria-hidden="true" />
          {{ openAction }}
        </Button>
      </div>
    </div>
  </div>
</template>
