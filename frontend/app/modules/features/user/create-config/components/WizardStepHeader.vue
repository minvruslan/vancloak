<script setup lang="ts">
import { ArrowLeft } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { messages } from "../translations/WizardStepHeader"

defineProps<{
  stepNumber: number
  stepCount: number
  title: string
  backDisabled?: boolean
}>()

defineEmits<{ (e: "back"): void }>()

const { t } = useI18n({ useScope: "local", messages })
</script>

<template>
  <div class="mb-4 flex items-center justify-between gap-3 sm:mb-4.5">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="-ml-2"
      :disabled="backDisabled"
      @click="$emit('back')"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />
      {{ t("back") }}
    </Button>
    <span class="text-xs text-muted-foreground">
      {{ t("stepOf", { number: stepNumber, count: stepCount }) }}
    </span>
  </div>

  <div class="mb-6 flex gap-1.5" aria-hidden="true">
    <span
      v-for="i in stepCount"
      :key="i"
      class="h-0.75 flex-1 rounded-sm"
      :class="i <= stepNumber ? 'bg-primary' : 'bg-border'"
    />
  </div>

  <h1 class="mb-4 text-lg font-semibold tracking-tight text-balance sm:mb-4.5 sm:text-2xl">
    {{ title }}
  </h1>
</template>
