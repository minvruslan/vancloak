<script setup lang="ts">
import type { Amneziawg2ConfigObfuscationLevel } from "@vancloak/api-contract"
import ConfigObfuscationLevelIcon from "./ConfigObfuscationLevelIcon.vue"
import ConfigObfuscationLevelName from "./ConfigObfuscationLevelName.vue"

defineProps<{ level: Amneziawg2ConfigObfuscationLevel }>()
</script>

<template>
  <span class="flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5">
    <ConfigObfuscationLevelIcon :level="level" class="size-3 shrink-0 text-foreground" />
    <span class="text-xs font-medium whitespace-nowrap">
      <ConfigObfuscationLevelName :level="level" />
    </span>
  </span>
</template>
