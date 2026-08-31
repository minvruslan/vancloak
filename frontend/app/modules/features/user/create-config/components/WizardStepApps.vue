<script setup lang="ts">
import { computed } from "vue"
import { Check, ChevronRight, Download } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import { WizardAppsByDeviceTypeCode } from "../constants/WizardAppsByDeviceTypeCode"
import type { WizardApp } from "../types/WizardApp"
import WizardStepHeader from "./WizardStepHeader.vue"
import WizardStepLayout from "./WizardStepLayout.vue"
import { messages } from "../translations/WizardStepApps"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const { t } = useI18n({ useScope: "local", messages })
const { selectedDeviceType, appId, stepNumber, stepCount, canContinue, next, back } = props.wizard

const apps = computed(() =>
  selectedDeviceType.value ? WizardAppsByDeviceTypeCode[selectedDeviceType.value.code] : [],
)

const selectedApp = computed(() => apps.value.find((app) => app.id === appId.value))

const openDownload = (app: WizardApp) => {
  window.open(app.downloadUrl, "_blank", "noopener")
}
</script>

<template>
  <WizardStepLayout>
    <template #header>
      <WizardStepHeader
        :step-number="stepNumber"
        :step-count="stepCount"
        :title="t('title')"
        @back="back"
      />
    </template>

    <p class="mb-4 text-sm leading-relaxed text-muted-foreground sm:mb-4.5">
      {{ t("description") }}
    </p>

    <div class="flex flex-col gap-3 pb-1">
      <div
        v-for="app in apps"
        :key="app.id"
        role="button"
        tabindex="0"
        class="relative flex shrink-0 cursor-pointer flex-col gap-3.5 rounded-lg border bg-muted/15 p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-transparent"
        :class="appId === app.id ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent/50'"
        :aria-pressed="appId === app.id"
        @click="appId = app.id"
        @keydown.enter.self.prevent="appId = app.id"
        @keydown.space.self.prevent="appId = app.id"
      >
        <span
          v-if="app.isRecommended && apps.length > 1"
          class="pointer-events-none absolute -top-2.5 right-2.5 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground ring-2 ring-background"
        >
          {{ t("recommended") }}
        </span>
        <div class="flex items-center gap-3">
          <img :src="app.iconUrl" :alt="app.name" class="size-10 shrink-0 rounded-lg border" />
          <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ app.name }}</span>
          <span
            class="flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors"
            :class="{ 'border-primary bg-primary': appId === app.id }"
            aria-hidden="true"
          >
            <Check v-if="appId === app.id" class="size-3 text-primary-foreground" />
          </span>
        </div>

        <p class="text-sm leading-relaxed text-muted-foreground">
          {{ t(`apps.${app.id}.description`) }}
        </p>

        <Button type="button" variant="outline" size="sm" class="w-full" @click="openDownload(app)">
          <Download class="size-4" aria-hidden="true" />
          {{ t("downloadAction") }}
        </Button>
      </div>
    </div>

    <template #footer>
      <Button type="button" class="w-full" :disabled="!canContinue" @click="next">
        {{
          selectedApp
            ? t("installedContinueAction", { name: selectedApp.name })
            : t("continueAction")
        }}
        <ChevronRight class="size-4" aria-hidden="true" />
      </Button>
    </template>
  </WizardStepLayout>
</template>
