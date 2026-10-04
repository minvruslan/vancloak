<script setup lang="ts">
import { Check } from "@lucide/vue"

defineProps<{ selected: boolean; disabled?: boolean }>()

defineEmits<{ (e: "select"): void }>()
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer items-center gap-3 rounded-lg border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
    :class="
      selected
        ? 'border-primary bg-card ring-1 ring-primary'
        : 'enabled:hover:bg-accent/50 disabled:opacity-50'
    "
    :disabled="disabled"
    :aria-pressed="selected"
    @click="$emit('select')"
  >
    <slot />
    <span
      class="flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors"
      :class="{ 'border-primary bg-primary': selected }"
      aria-hidden="true"
    >
      <Check v-if="selected" class="size-3 text-primary-foreground" />
    </span>
  </button>
</template>
