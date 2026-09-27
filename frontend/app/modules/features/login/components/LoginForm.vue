<script setup lang="ts">
import { Mail } from "@lucide/vue"
import { messages } from "../translations/LoginForm"

const props = defineProps<{ pending?: boolean; failed?: boolean }>()

const email = defineModel<string>("email", { default: "" })
const emit = defineEmits<{ (e: "submit"): void }>()
const { t } = useI18n({ useScope: "local", messages })

const emailInput = ref<{ $el: HTMLInputElement } | null>(null)
onMounted(() => emailInput.value?.$el?.focus())

const onSubmit = () => {
  if (props.pending) return
  emit("submit")
}
</script>

<template>
  <div class="mb-4 flex flex-col items-center gap-1.5">
    <h1 class="text-xl font-semibold tracking-tight">{{ t("title") }}</h1>
    <span class="text-sm font-medium text-muted-foreground">{{ t("subTitle") }}</span>
  </div>

  <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
    <div class="flex flex-col gap-2">
      <Label for="email">{{ t("email.label") }}</Label>
      <Input
        id="email"
        ref="emailInput"
        v-model="email"
        type="email"
        autocomplete="email"
        class="bg-background"
        :placeholder="t('email.placeholder')"
      />
    </div>

    <Button type="submit" class="w-full" :loading="pending">
      <Mail class="size-4" aria-hidden="true" />
      {{ t("sendLoginCodeAction") }}
    </Button>

    <p v-if="failed" class="text-center text-sm whitespace-pre-line text-destructive">
      {{ t("sendFailedBody") }}
    </p>
  </form>
</template>
