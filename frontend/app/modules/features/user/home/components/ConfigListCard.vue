<script setup lang="ts">
import type { Config } from "@vancloak/api-contract"
import { computed } from "vue"
import { Plus } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import ConfigList from "./ConfigList.vue"
import ConfigListEmptyState from "./ConfigListEmptyState.vue"
import { messages } from "../translations/ConfigListCard"

const props = defineProps<{
  configs: Config[]
  pending?: boolean
  error?: boolean
  limitReached?: boolean
}>()

defineEmits<{ (e: "open", config: Config): void; (e: "create"): void }>()

const { t } = useI18n({ useScope: "local", messages })

const isEmpty = computed(() => !props.pending && !props.error && props.configs.length === 0)
</script>

<template>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card p-7 max-sm:p-4.5"
  >
    <div v-if="isEmpty" class="flex flex-1 flex-col items-center justify-center">
      <ConfigListEmptyState @create="$emit('create')" />
    </div>

    <template v-else>
      <div class="hidden items-center justify-between gap-3 sm:flex">
        <h1 class="text-lg font-semibold tracking-tight">{{ t("title") }}</h1>
        <Button v-if="!pending" :disabled="limitReached" @click="$emit('create')">
          <Plus class="size-4" aria-hidden="true" />
          {{ t("createAction") }}
        </Button>
      </div>

      <Button
        v-if="!pending"
        class="w-full sm:hidden"
        :disabled="limitReached"
        @click="$emit('create')"
      >
        <Plus class="size-4" aria-hidden="true" />
        {{ t("createAction") }}
      </Button>

      <p v-if="error" role="alert" class="mt-3 text-sm text-muted-foreground">
        {{ t("loadError") }}
      </p>

      <ConfigList v-else :configs="configs" :pending="pending" @open="$emit('open', $event)" />
    </template>
  </div>
</template>
