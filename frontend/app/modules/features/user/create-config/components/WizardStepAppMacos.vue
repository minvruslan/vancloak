<script setup lang="ts">
import { computed } from "vue"
import { ChevronRight } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import { WizardAppsByDeviceTypeCode } from "../constants/WizardAppsByDeviceTypeCode"
import WizardStepHeader from "./WizardStepHeader.vue"
import WizardStepLayout from "./WizardStepLayout.vue"
import { messages } from "../translations/WizardStepAppMacos"

const INSTALL_STEPS = [
  { id: "download", hasLink: true },
  { id: "mirror", hasLink: true },
  { id: "open" },
  { id: "install" },
] as const

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const { t } = useI18n({ useScope: "local", messages })
const { selectedDeviceType, appId, stepNumber, stepCount, next, back } = props.wizard

const app = computed(() =>
  selectedDeviceType.value
    ? WizardAppsByDeviceTypeCode[selectedDeviceType.value.code][0]
    : undefined,
)

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

    <ol class="flex flex-col gap-3 pb-1">
      <li v-for="(step, index) in INSTALL_STEPS" :key="step.id" class="flex items-start gap-3">
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
        >
          {{ index + 1 }}
        </span>
        <span class="mt-px text-sm leading-relaxed text-muted-foreground">
          {{ t(`steps.${step.id}`, { name: app?.name }) }}
          <a
            v-if="'hasLink' in step"
            :href="t(`steps.${step.id}LinkUrl`)"
            target="_blank"
            rel="noopener"
            class="font-medium text-foreground underline underline-offset-4"
          >
            {{ t(`steps.${step.id}LinkLabel`) }}
          </a>
        </span>
      </li>
    </ol>

    <template #footer>
      <Button type="button" class="w-full" :disabled="!app" @click="confirmInstalled">
        {{ t("installedAction", { name: app?.name }) }}
        <ChevronRight class="size-4" aria-hidden="true" />
      </Button>
    </template>
  </WizardStepLayout>
</template>
