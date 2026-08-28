<script setup lang="ts">
import { onMounted, ref } from "vue"
import { ChevronRight } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import WizardStepHeader from "./WizardStepHeader.vue"
import WizardStepLayout from "./WizardStepLayout.vue"
import { messages } from "../translations/WizardStepName"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

defineEmits<{ (e: "exit"): void }>()

const { t } = useI18n({ useScope: "local", messages })
const { name, stepNumber, stepCount, canContinue, next } = props.wizard

const nameInput = ref<{ $el: HTMLInputElement } | null>(null)

onMounted(() => {
  if (window.matchMedia("(min-width: 40rem)").matches) nameInput.value?.$el?.focus()
})
</script>

<template>
  <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="next">
    <WizardStepLayout>
      <template #header>
        <WizardStepHeader
          :step-number="stepNumber"
          :step-count="stepCount"
          :title="t('title')"
          @back="$emit('exit')"
        />
      </template>

      <p class="mb-4 text-sm leading-relaxed text-muted-foreground sm:mb-4.5">
        {{ t("description") }}
      </p>

      <div class="flex flex-col">
        <label for="configName" class="sr-only">{{ t("field.label") }}</label>
        <Input
          id="configName"
          ref="nameInput"
          v-model="name"
          :placeholder="t('field.placeholder')"
        />
      </div>

      <template #footer>
        <Button type="submit" class="w-full" :disabled="!canContinue">
          {{ t("continueAction") }}
          <ChevronRight class="size-4" aria-hidden="true" />
        </Button>
      </template>
    </WizardStepLayout>
  </form>
</template>
