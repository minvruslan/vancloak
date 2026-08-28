<script setup lang="ts">
import { ChevronRight } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Amneziawg3ObfuscationLevelOrder } from "@vancloak/api-contract"
import { ConfigObfuscationLevelIcon } from "@/modules/entities/config"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import WizardSelectableTile from "./WizardSelectableTile.vue"
import WizardStepHeader from "./WizardStepHeader.vue"
import WizardStepLayout from "./WizardStepLayout.vue"
import { messages } from "../translations/WizardStepProfile"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const { t } = useI18n({ useScope: "local", messages })
const { obfuscationLevel, stepNumber, stepCount, canContinue, next, back } = props.wizard
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

    <div class="grid auto-rows-fr gap-2.5">
      <WizardSelectableTile
        v-for="level in Amneziawg3ObfuscationLevelOrder"
        :key="level"
        class="gap-4"
        :selected="obfuscationLevel === level"
        @select="obfuscationLevel = level"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <ConfigObfuscationLevelIcon :level="level" class="size-4.5 text-foreground" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="text-sm font-semibold">{{ t(`levels.${level}.title`) }}</span>
          <span class="text-xs leading-snug text-muted-foreground">
            {{ t(`levels.${level}.description`) }}
            <span class="max-xs:block">{{ t(`levels.${level}.note`) }}</span>
          </span>
        </div>
      </WizardSelectableTile>
    </div>

    <template #footer>
      <Button type="button" class="w-full" :disabled="!canContinue" @click="next">
        {{ t("continueAction") }}
        <ChevronRight class="size-4" aria-hidden="true" />
      </Button>
    </template>
  </WizardStepLayout>
</template>
