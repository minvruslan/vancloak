<script setup lang="ts">
import type { Config } from "@vancloak/api-contract"
import { ChevronRight } from "@lucide/vue"
import { useCountries } from "@/modules/shared/composables"

defineProps<{ config: Config }>()

defineEmits<{ (e: "open"): void }>()

const { getCountryName } = useCountries()
</script>

<template>
  <button
    type="button"
    class="flex w-full shrink-0 cursor-pointer items-center gap-3 rounded-lg border p-4 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50 max-sm:gap-2.5 max-sm:px-3.5 max-sm:py-3 max-sm:active:scale-[0.98]"
    @click="$emit('open')"
  >
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-sm font-semibold">{{ config.name }}</span>
      <span class="flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
        <span class="shrink-0">{{ config.endpoint.server.name }}</span>
        <span class="opacity-60" aria-hidden="true">·</span>
        <span class="min-w-0 truncate">{{ getCountryName(config.endpoint.server.country) }}</span>
      </span>
    </span>

    <ChevronRight class="size-4 shrink-0 text-muted-foreground max-sm:hidden" aria-hidden="true" />
  </button>
</template>
