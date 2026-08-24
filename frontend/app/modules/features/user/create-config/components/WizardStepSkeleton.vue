<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"
import { WizardStepOrder } from "../types/WizardStepOrder"
import WizardStepLayout from "./WizardStepLayout.vue"
</script>

<template>
  <WizardStepLayout>
    <template #header>
      <div class="mb-4 flex h-8 items-center justify-between gap-3 sm:mb-4.5">
        <Skeleton class="h-4 w-16" />
        <Skeleton class="h-4 w-14" />
      </div>
      <div class="mb-6 flex gap-1.5">
        <Skeleton v-for="i in WizardStepOrder.length" :key="i" class="h-0.75 flex-1 rounded-sm" />
      </div>
      <Skeleton class="mb-4 h-7 w-48 sm:mb-4.5 sm:h-8 sm:w-64" />
    </template>

    <div class="mb-4 flex flex-col gap-1.5 sm:mb-4.5">
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/4" />
    </div>

    <div class="flex flex-col gap-2">
      <Skeleton class="h-5 w-24" />
      <Skeleton class="h-9 w-full rounded-md" />
    </div>

    <template #footer>
      <Skeleton class="h-9 w-full rounded-md" />
    </template>
  </WizardStepLayout>
</template>
