<script setup lang="ts">
import { LogIn } from "@lucide/vue"
import { REGEXP_ONLY_DIGITS } from "vue-input-otp"
import { messages } from "../translations/LoginCodeEntry"
import type { VerifyLoginCodeFailure } from "../types/VerifyLoginCodeFailure"

const props = defineProps<{
  email: string
  pending?: boolean
  failure?: VerifyLoginCodeFailure | null
  sendFailed?: boolean
}>()

const failureMessageKeys: Record<VerifyLoginCodeFailure, string> = {
  invalidCode: "invalidCodeBody",
  rateLimited: "rateLimitedBody",
  tooManyAttempts: "tooManyAttemptsBody",
}

const code = defineModel<string>("code", { default: "" })
const emit = defineEmits<{ (e: "submit" | "resend" | "useDifferentEmail"): void }>()
const { t } = useI18n({ useScope: "local", messages })

const codeInputs = ref<HTMLDivElement | null>(null)
const focusCodeInput = () => codeInputs.value?.querySelector("input")?.focus()
onMounted(focusCodeInput)
watch(
  () => props.failure,
  async (failure) => {
    if (!failure) return
    await nextTick()
    focusCodeInput()
  },
)

const onSubmit = () => {
  if (props.pending || code.value.length < 6) return
  emit("submit")
}
</script>

<template>
  <div class="mb-4 flex flex-col items-center gap-1.5 text-center">
    <h1 class="text-xl font-semibold tracking-tight">{{ t("title") }}</h1>
    <p class="max-w-80 truncate text-sm font-medium text-muted-foreground">
      {{ t("bodyBeforeEmail") }}
      <span class="text-foreground">{{ email }}</span>
    </p>
  </div>

  <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
    <div ref="codeInputs" class="flex flex-col items-center gap-2">
      <InputOTP
        v-model="code"
        :maxlength="6"
        :pattern="REGEXP_ONLY_DIGITS"
        :aria-label="t('codeLabel')"
        :disabled="pending"
        @complete="onSubmit"
      >
        <InputOTPGroup>
          <InputOTPSlot v-for="index in 6" :key="index" :index="index - 1" class="bg-background" />
        </InputOTPGroup>
      </InputOTP>
    </div>

    <Button type="submit" class="w-full" :loading="pending">
      <LogIn class="size-4" aria-hidden="true" />
      {{ t("signInAction") }}
    </Button>

    <p v-if="failure" class="text-center text-sm whitespace-pre-line text-destructive">
      {{ t(failureMessageKeys[failure]) }}
    </p>
    <p v-if="sendFailed" class="text-center text-sm whitespace-pre-line text-destructive">
      {{ t("sendFailedBody") }}
    </p>
  </form>

  <p class="mt-4 text-center text-sm text-muted-foreground">
    {{ t("codeMissingQuestion") }}
    <button
      type="button"
      class="cursor-pointer rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      @click="emit('resend')"
    >
      {{ t("resendAction") }}
    </button>
  </p>
  <p class="mt-1 text-center text-sm text-muted-foreground">
    {{ t("wrongEmailQuestion") }}
    <button
      type="button"
      class="cursor-pointer rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      @click="emit('useDifferentEmail')"
    >
      {{ t("useDifferentEmailAction") }}
    </button>
  </p>
</template>
