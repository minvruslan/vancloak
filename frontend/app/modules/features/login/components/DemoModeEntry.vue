<script setup lang="ts">
import { Sparkles } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { useDemoMode } from "@/modules/demo"
import { messages } from "../translations/DemoModeEntry"

const { t } = useI18n({ useScope: "local", messages })
const { enterDemoMode } = useDemoMode()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <span class="h-px flex-1 bg-border" aria-hidden="true"></span>
      <span class="text-xs text-muted-foreground">{{ t("noInviteLabel") }}</span>
      <span class="h-px flex-1 bg-border" aria-hidden="true"></span>
    </div>
    <Button type="button" variant="secondary" class="w-full" @click="enterDemoMode">
      <Sparkles class="size-4" aria-hidden="true" />
      {{ t("enterDemoModeAction") }}
    </Button>
  </div>
</template>
