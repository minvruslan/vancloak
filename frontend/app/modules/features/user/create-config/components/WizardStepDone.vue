<script setup lang="ts">
import { computed } from "vue"
import { Check, Copy, Download } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { useCountries } from "@/modules/shared/composables"
import { buildConfigFileName } from "@/modules/entities/config"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import { WizardSetupStepsByDeviceTypeCode } from "../constants/WizardSetupStepsByDeviceTypeCode"
import type { WizardAppId } from "../types/WizardAppId"
import type { WizardSetupStep } from "../types/WizardSetupStep"
import WizardStepLayout from "./WizardStepLayout.vue"
import WizardTimelineItem from "./WizardTimelineItem.vue"
import { messages } from "../translations/WizardStepDone"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const emit = defineEmits<{ (e: "done"): void }>()

const { t } = useI18n({ useScope: "local", messages })
const { getCountryName } = useCountries()
const { showSuccess, showError } = useNotificationBanner()
const { created, selectedApp } = props.wizard

const setupSteps = computed<readonly WizardSetupStep[]>(() => {
  if (!created.value || !selectedApp.value) return []
  const appSteps: Partial<Record<WizardAppId, readonly WizardSetupStep[]>> =
    WizardSetupStepsByDeviceTypeCode[created.value.deviceType.code]
  return appSteps[selectedApp.value.id] ?? []
})

const setupStepText = (step: WizardSetupStep) =>
  created.value && selectedApp.value
    ? t(`apps.${created.value.deviceType.code}.${selectedApp.value.id}.steps.${step.id}`)
    : ""

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
    <ol class="flex flex-col pb-1">
      <WizardTimelineItem marker="completed">
        <div class="flex flex-col gap-3.5 pb-1.5">
          <div class="flex flex-col gap-1">
            <h1 class="mt-px text-base font-semibold">{{ t("title") }}</h1>
            <p class="text-sm text-muted-foreground">
              {{ created.deviceType.name }} · {{ created.endpoint.server.name }} ·
              {{ getCountryName(created.endpoint.server.country) }}
            </p>
          </div>

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
      </WizardTimelineItem>

      <WizardTimelineItem
        v-for="(step, index) in setupSteps"
        :key="step.id"
        :marker="index + 1"
        :last="index === setupSteps.length - 1"
      >
        <Collapsible v-if="step.screenshotUrl" class="group flex flex-col gap-2.5">
          <p class="mt-px text-sm leading-relaxed break-words text-muted-foreground">
            {{ setupStepText(step) }}
            <CollapsibleTrigger as-child>
              <button
                type="button"
                class="cursor-pointer rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span class="group-data-[state=open]:hidden">{{ t("showScreenshotAction") }}</span>
                <span class="hidden group-data-[state=open]:inline">
                  {{ t("hideScreenshotAction") }}
                </span>
              </button>
            </CollapsibleTrigger>
          </p>
          <CollapsibleContent>
            <img :src="step.screenshotUrl" alt="" class="w-full rounded-lg border" />
          </CollapsibleContent>
        </Collapsible>
        <p v-else class="mt-px text-sm leading-relaxed break-words text-muted-foreground">
          {{ setupStepText(step) }}
        </p>
      </WizardTimelineItem>
    </ol>

    <template #footer>
      <Button type="button" class="w-full" @click="emit('done')">
        <Check class="size-4" aria-hidden="true" />
        {{ t("doneAction") }}
      </Button>
    </template>
  </WizardStepLayout>
</template>
