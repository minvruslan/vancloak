<script setup lang="ts">
import type { ConfigLimit } from "@vancloak/api-contract"
import { Skeleton } from "@/components/ui/skeleton"
import { isReachedConfigLimit } from "@/modules/entities/config-limit"
import { messages } from "../translations/ConfigLimitsCard"

defineProps<{
  configLimits: ConfigLimit[]
  pending?: boolean
  error?: boolean
}>()

const { t } = useI18n({ useScope: "local", messages })

const fillPercent = (configLimit: ConfigLimit) =>
  Math.min(100, Math.max(0, (configLimit.used / configLimit.maxCount) * 100))
</script>

<template>
  <div class="rounded-2xl border bg-card p-7 max-sm:p-4.5">
    <p v-if="error" role="alert" class="text-sm text-muted-foreground">{{ t("error") }}</p>

    <div v-else-if="pending" class="flex flex-wrap gap-4">
      <div class="flex min-w-45 flex-1 flex-col gap-2.5">
        <div class="flex h-5 items-center justify-between gap-3">
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-3 w-8" />
        </div>
        <Skeleton class="h-1.5 w-full rounded-full" />
      </div>
    </div>

    <p v-else-if="!configLimits.length" class="text-sm text-muted-foreground">{{ t("empty") }}</p>

    <div v-else class="flex flex-wrap gap-4">
      <div
        v-for="configLimit in configLimits"
        :key="configLimit.id"
        class="flex min-w-45 flex-1 flex-col gap-2.5"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium">{{ t("usedTitle") }}</span>
          <span class="font-mono text-xs text-muted-foreground">
            {{ configLimit.used }}/{{ configLimit.maxCount }}
          </span>
        </div>
        <div aria-hidden="true" class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            class="h-full rounded-full transition-[width] duration-300"
            :class="isReachedConfigLimit(configLimit) ? 'bg-destructive' : 'bg-primary'"
            :style="{ width: `${fillPercent(configLimit)}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
