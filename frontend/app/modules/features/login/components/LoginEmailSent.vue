<script setup lang="ts">
import { CheckCircle2 } from "@lucide/vue"
import { messages } from "../translations/LoginEmailSent"

defineProps<{ email: string }>()

const emit = defineEmits<{ (e: "useDifferentEmail"): void }>()
const { t } = useI18n({ useScope: "local", messages })

const heading = ref<HTMLHeadingElement | null>(null)
onMounted(() => heading.value?.focus())
</script>

<template>
  <div class="flex flex-col items-center gap-4 text-center">
    <div class="flex items-center gap-2.5">
      <CheckCircle2 class="size-5.5 text-green-600" aria-hidden="true" />
      <h1 ref="heading" tabindex="-1" class="mt-px text-xl font-semibold tracking-tight outline-none">
        {{ t("title") }}
      </h1>
    </div>
    <p class="max-w-80 text-sm leading-relaxed text-muted-foreground">
      {{ t("bodyBeforeEmail") }}
      <span class="block truncate font-medium text-foreground">{{ email }}</span>
    </p>
    <p class="mt-1 text-sm text-muted-foreground">
      {{ t("wrongEmailQuestion") }}
      <button
        type="button"
        class="cursor-pointer rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        @click="emit('useDifferentEmail')"
      >
        {{ t("useDifferentEmailAction") }}
      </button>
    </p>
  </div>
</template>
