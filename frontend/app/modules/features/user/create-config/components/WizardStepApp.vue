<script setup lang="ts">
import { computed } from "vue"
import { ChevronRight } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import { WizardAppsByDeviceTypeCode } from "../constants/WizardAppsByDeviceTypeCode"
import { WizardMinimumOsVersionByDeviceTypeCode } from "../constants/WizardMinimumOsVersionByDeviceTypeCode"
import WizardAppLinkCard from "./WizardAppLinkCard.vue"
import WizardStepHeader from "./WizardStepHeader.vue"
import WizardStepLayout from "./WizardStepLayout.vue"
import WizardTimelineItem from "./WizardTimelineItem.vue"
import { messages } from "../translations/WizardStepApp"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const { t, tm, rt } = useI18n({ useScope: "local", messages })
const { selectedDeviceType, appId, stepNumber, stepCount, next, back } = props.wizard

const app = computed(() =>
  selectedDeviceType.value
    ? WizardAppsByDeviceTypeCode[selectedDeviceType.value.code][0]
    : undefined,
)

const deviceTypeCode = computed(() => selectedDeviceType.value?.code)

const minimumOsVersion = computed(() =>
  deviceTypeCode.value ? WizardMinimumOsVersionByDeviceTypeCode[deviceTypeCode.value] : "",
)

const openAction = computed(() =>
  deviceTypeCode.value ? t(`apps.${deviceTypeCode.value}.openAction`) : "",
)

const note = computed(() =>
  deviceTypeCode.value && app.value?.installSource === "website"
    ? t(`apps.${deviceTypeCode.value}.note`)
    : undefined,
)

const installSteps = computed(() => {
  if (!deviceTypeCode.value) return []
  const steps = tm(`apps.${deviceTypeCode.value}.steps`)
  return Array.isArray(steps) ? steps : []
})

const confirmInstalled = () => {
  if (!app.value) return
  appId.value = app.value.id
  next()
}
</script>

<template>
  <WizardStepLayout>
    <template #header>
      <WizardStepHeader
        :step-number="stepNumber"
        :step-count="stepCount"
        :title="t('title', { name: app?.name })"
        @back="back"
      />
    </template>

    <template v-if="app">
      <ol v-if="installSteps.length" class="flex flex-col pb-1">
        <WizardTimelineItem :marker="1">
          <div class="flex flex-col gap-2.5">
            <p class="mt-px text-sm leading-relaxed text-muted-foreground">
              {{ t("downloadStepTitle") }}
            </p>
            <WizardAppLinkCard
              :app="app"
              :minimum-os-version="minimumOsVersion"
              :open-action="openAction"
              :note="note"
              size="compact"
            />
          </div>
        </WizardTimelineItem>
        <WizardTimelineItem
          v-for="(step, index) in installSteps"
          :key="index"
          :marker="index + 2"
          :last="index === installSteps.length - 1"
        >
          <p class="mt-px text-sm leading-relaxed break-words text-muted-foreground">
            {{ rt(step) }}
          </p>
        </WizardTimelineItem>
      </ol>

      <template v-else>
        <p class="mb-4 text-sm leading-relaxed text-muted-foreground sm:mb-4.5">
          {{ t("description") }}
        </p>
        <WizardAppLinkCard
          class="mb-1"
          :app="app"
          :minimum-os-version="minimumOsVersion"
          :open-action="openAction"
          :note="note"
          size="large"
        />
      </template>
    </template>

    <template #footer>
      <Button type="button" class="w-full" :disabled="!app" @click="confirmInstalled">
        {{ t("installedAction", { name: app?.name }) }}
        <ChevronRight class="size-4" aria-hidden="true" />
      </Button>
    </template>
  </WizardStepLayout>
</template>
