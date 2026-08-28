<script setup lang="ts">
import type { Config } from "@vancloak/api-contract"
import ConfigCard from "./ConfigCard.vue"
import ConfigCardSkeleton from "./ConfigCardSkeleton.vue"

withDefaults(
  defineProps<{
    configs: Config[]
    pending?: boolean
    skeletonCount?: number
  }>(),
  { skeletonCount: 3 },
)

defineEmits<{ (e: "open", config: Config): void }>()
</script>

<template>
  <div
    v-if="pending"
    class="-m-1 mt-3.5 -mr-7 flex min-h-0 flex-1 flex-col gap-2.5 p-1 pr-7 max-sm:-mr-4.5 max-sm:pr-4.5 sm:mt-6"
  >
    <ConfigCardSkeleton v-for="i in skeletonCount" :key="i" />
  </div>

  <div
    v-else
    class="-m-1 mt-3.5 -mr-7 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-1 pr-7 max-sm:-mr-4.5 max-sm:pr-4.5 sm:mt-6"
  >
    <ConfigCard
      v-for="config in configs"
      :key="config.id"
      :config="config"
      @open="$emit('open', config)"
    />
  </div>
</template>
