<script setup lang="ts">
import { Check } from "@lucide/vue"

defineProps<{ marker: number | "completed"; last?: boolean }>()
</script>

<template>
  <li class="flex gap-3">
    <div class="flex flex-col items-center">
      <span
        class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
        :class="marker === 'completed' ? 'bg-emerald-600/10 dark:bg-emerald-400/10' : 'bg-muted'"
      >
        <Check
          v-if="marker === 'completed'"
          class="size-3.5 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <template v-else>{{ marker }}</template>
      </span>
      <span v-if="!last" class="my-1 w-0.5 flex-1 rounded-full bg-border" aria-hidden="true" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col" :class="last ? 'pb-0' : 'pb-3'">
      <slot />
    </div>
  </li>
</template>
