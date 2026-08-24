<script setup lang="ts">
import { computed } from "vue"
import { Check, CheckCircle2, Copy, Download, ListChecks } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useCountries } from "@/modules/shared/composables"
import { buildConfigFileName } from "@/modules/entities/config"
import { DeviceTypeName } from "@/modules/entities/device-type"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import WizardStepLayout from "./WizardStepLayout.vue"
import { messages } from "../translations/WizardStepDone"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const emit = defineEmits<{ (e: "done"): void }>()

const { t, tm, rt } = useI18n({ useScope: "local", messages })
const { getCountryName } = useCountries()
const { showSuccess, showError } = useNotificationBanner()
const { created, selectedApp } = props.wizard

const instructionSteps = computed(() =>
  created.value && selectedApp.value
    ? tm(`apps.${selectedApp.value.id}.${created.value.deviceType.code}.steps`)
    : [],
)

const fileName = computed(() =>
  created.value ? buildConfigFileName(created.value) : "config.conf",
)

const downloadConfiguration = () => {
  if (!created.value) return
  const blob = new Blob([created.value.clientConfiguration], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName.value
  anchor.click()
  URL.revokeObjectURL(url)
}

const copyLink = async () => {
  if (!created.value) return
  try {
    await navigator.clipboard.writeText(created.value.clientConfigurationLink)
    showSuccess(t("notifications.copied"))
  } catch {
    showError(t("notifications.copyError"))
  }
}
</script>

<template>
  <WizardStepLayout v-if="created && selectedApp">
    <template #header>
      <div class="mb-4 flex items-center gap-2.5 sm:mb-4.5">
        <CheckCircle2
          class="-mt-px size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <h1 class="text-base font-semibold">{{ t("title") }}</h1>
      </div>
    </template>

    <div class="flex flex-col gap-4 sm:gap-4.5">
      <p class="text-sm text-muted-foreground">
        {{ created.endpoint.server.name }} · {{ getCountryName(created.endpoint.server.country) }} ·
        <DeviceTypeName :code="created.deviceType.code" />
      </p>

      <div class="flex flex-col gap-3.5">
        <Input
          :model-value="created.clientConfigurationLink"
          readonly
          :aria-label="t('linkAriaLabel')"
        />
        <div class="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" class="w-full sm:flex-1" @click="copyLink">
            <Copy class="size-4" aria-hidden="true" />
            {{ t("copyAction") }}
          </Button>
          <Button
            type="button"
            variant="outline"
            class="w-full sm:flex-1"
            @click="downloadConfiguration"
          >
            <Download class="size-4" aria-hidden="true" />
            {{ t("downloadAction") }}
          </Button>
        </div>
      </div>

      <Separator />

      <div class="flex flex-col gap-3.5">
        <div class="flex items-center gap-2.5">
          <ListChecks class="-mt-px size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <h2 class="text-base font-semibold">{{ t("setupTitle", { name: selectedApp.name }) }}</h2>
        </div>

        <ol class="flex flex-col gap-3">
          <li v-for="(step, index) in instructionSteps" :key="index" class="flex items-start gap-3">
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
            >
              {{ index + 1 }}
            </span>
            <span class="text-sm leading-relaxed text-muted-foreground">
              {{ rt(step) }}
            </span>
          </li>
        </ol>
      </div>
    </div>

    <template #footer>
      <Button type="button" class="w-full" @click="emit('done')">
        <Check class="size-4" aria-hidden="true" />
        {{ t("doneAction") }}
      </Button>
    </template>
  </WizardStepLayout>
</template>
