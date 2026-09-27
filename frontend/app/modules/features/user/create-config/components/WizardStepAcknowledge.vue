<script setup lang="ts">
import { TriangleAlert } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import WizardStepHeader from "./WizardStepHeader.vue"
import WizardStepLayout from "./WizardStepLayout.vue"
import { messages } from "../translations/WizardStepAcknowledge"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const { t } = useI18n({ useScope: "local", messages })
const { showError } = useNotificationBanner()
const { pending, stepNumber, stepCount, submit, back } = props.wizard

const onSubmit = async () => {
  if (pending.value) return
  const submitResult = await submit()
  if (!submitResult) showError(t("notifications.createError"))
}
</script>

<template>
  <WizardStepLayout>
    <template #header>
      <WizardStepHeader
        :step-number="stepNumber"
        :step-count="stepCount"
        :title="t('title')"
        :back-disabled="pending"
        @back="back"
      />
    </template>

    <p class="mb-4 text-sm leading-relaxed text-muted-foreground sm:mb-4.5">
      {{ t("description") }}
    </p>

    <div class="flex flex-col gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
      <div class="flex items-center gap-2.5">
        <TriangleAlert
          class="size-4.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <span class="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {{ t("warningBanner.title") }}
        </span>
      </div>
      <p class="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
        {{ t("warningBanner.description") }}
      </p>
    </div>

    <template #footer>
      <Button type="button" class="w-full" :loading="pending" @click="onSubmit">
        {{ t("createAction") }}
      </Button>
    </template>
  </WizardStepLayout>
</template>
