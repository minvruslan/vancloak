<script setup lang="ts">
import { MonitorSmartphone, Plus } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { messages } from "../translations/ConfigListEmptyState"

defineEmits<{ (e: "create"): void }>()

const { t } = useI18n({ useScope: "local", messages })
</script>

<template>
  <div class="flex flex-col items-center gap-4 text-center">
    <div class="flex size-20 items-center justify-center rounded-2xl bg-primary/10">
      <MonitorSmartphone class="size-9 text-primary" aria-hidden="true" />
    </div>

    <div class="flex flex-col gap-1.5">
      <h3 class="text-lg font-semibold tracking-tight">{{ t("title") }}</h3>
      <p class="max-w-80 text-sm leading-relaxed text-muted-foreground">
        {{ t("descriptionFirstLine") }}
        <br />
        {{ t("descriptionSecondLine") }}
      </p>
    </div>

    <Button @click="$emit('create')">
      <Plus class="size-4" aria-hidden="true" />
      {{ t("createAction") }}
    </Button>
  </div>
</template>
