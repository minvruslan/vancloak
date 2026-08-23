<script setup lang="ts">
import { computed } from "vue"
import { Check, Copy, Download, FileText, Info } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldLabel, ViewLayout } from "@/modules/shared/components"
import { buildConfigFileName, type CreatedConfig } from "@/modules/entities/config"
import { messages } from "../translations/ConfigCreatedView"

const props = defineProps<{ config: CreatedConfig }>()
const emit = defineEmits<{ (e: "done"): void }>()

const { t, locale } = useI18n({ useScope: "local", messages })

const actionButtonWidthClass = computed(() => (locale.value === "ru" ? "w-48" : "w-28"))
const { showSuccess, showError } = useNotificationBanner()

const fileName = computed(() => buildConfigFileName(props.config))
const fileKilobytes = computed(() =>
  (new Blob([props.config.clientConfiguration]).size / 1024).toFixed(1),
)

const downloadConfiguration = () => {
  const blob = new Blob([props.config.clientConfiguration], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName.value
  anchor.click()
  URL.revokeObjectURL(url)
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(props.config.clientConfigurationLink)
    showSuccess(t("notifications.copied"))
  } catch {
    showError(t("notifications.copyError"))
  }
}
</script>

<template>
  <ViewLayout>
    <template #title>
      <h1 class="text-lg font-semibold tracking-tight">{{ t("title") }}</h1>
    </template>

    <template #body>
      <div
        role="alert"
        class="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm"
      >
        <Info class="size-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p>{{ t("warning.shownOnce") }}</p>
          <p>{{ t("warning.unrecoverable") }}</p>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <FieldLabel for="createdConfigName">{{ t("fields.name.label") }}</FieldLabel>
        <Input
          id="createdConfigName"
          :model-value="config.name"
          readonly
          tabindex="-1"
          class="bg-muted text-muted-foreground"
        />
      </div>

      <div class="flex flex-col gap-2">
        <FieldLabel for="clientConfigurationLink">{{ t("fields.link.label") }}</FieldLabel>
        <div class="flex gap-2">
          <Input
            id="clientConfigurationLink"
            :model-value="config.clientConfigurationLink"
            readonly
            class="bg-muted text-muted-foreground"
          />
          <Button type="button" variant="outline" :class="actionButtonWidthClass" @click="copyLink">
            <Copy class="size-4" aria-hidden="true" />
            {{ t("actions.copy") }}
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <FieldLabel>{{ t("fields.file.label") }}</FieldLabel>
        <div class="flex items-center gap-2">
          <div class="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border px-3 text-sm">
            <FileText class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="truncate font-medium">{{ fileName }}</span>
            <span class="ml-auto shrink-0 text-xs text-muted-foreground">
              {{ t("fields.file.size", { kilobytes: fileKilobytes }) }}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            :class="actionButtonWidthClass"
            @click="downloadConfiguration"
          >
            <Download class="size-4" aria-hidden="true" />
            {{ t("actions.download") }}
          </Button>
        </div>
      </div>
    </template>

    <template #actions>
      <Button type="button" class="w-full sm:w-32" @click="emit('done')">
        <Check class="size-4" aria-hidden="true" />
        {{ t("actions.done") }}
      </Button>
    </template>
  </ViewLayout>
</template>
