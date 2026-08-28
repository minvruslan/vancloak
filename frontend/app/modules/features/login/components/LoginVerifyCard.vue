<script setup lang="ts">
import { LogIn, XCircle } from "@lucide/vue"
import { useVerifyLogin } from "../composables/useVerifyLogin"
import { messages } from "../translations/LoginVerifyCard"

const { pending, failed, submit } = useVerifyLogin()
const { t } = useI18n({ useScope: "local", messages })

const heading = ref<HTMLHeadingElement | null>(null)
watch(failed, async () => {
  await nextTick()
  heading.value?.focus()
})
</script>

<template>
  <div v-if="!failed" class="flex flex-col items-center gap-4 text-center">
    <h1 class="text-xl font-semibold tracking-tight">{{ t("title") }}</h1>
    <p class="max-w-80 text-sm leading-relaxed text-muted-foreground">{{ t("body") }}</p>
    <Button class="w-full" :loading="pending" @click="submit">
      <LogIn class="size-4" aria-hidden="true" />
      {{ t("signInAction") }}
    </Button>
  </div>
  <div v-else class="flex flex-col items-center gap-4 text-center">
    <div class="flex items-center gap-2.5">
      <XCircle class="size-5.5 text-destructive" aria-hidden="true" />
      <h1
        ref="heading"
        tabindex="-1"
        class="mt-px text-xl font-semibold tracking-tight outline-none"
      >
        {{ t("failedTitle") }}
      </h1>
    </div>
    <p class="max-w-72 text-sm leading-relaxed text-muted-foreground">{{ t("failedBody") }}</p>
    <Button variant="ghost" size="sm" as-child>
      <NuxtLink to="/login">{{ t("requestNewLinkAction") }}</NuxtLink>
    </Button>
  </div>
</template>
