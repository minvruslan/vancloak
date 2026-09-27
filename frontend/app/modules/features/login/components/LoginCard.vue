<script setup lang="ts">
import DemoModeEntry from "./DemoModeEntry.vue"
import { useLogin } from "../composables/useLogin"
import LoginForm from "./LoginForm.vue"
import LoginCodeEntry from "./LoginCodeEntry.vue"

const {
  email,
  code,
  pending,
  codeSent,
  codeFailure,
  sendFailed,
  submit,
  submitCode,
  resend,
  reset,
} = useLogin()
</script>

<template>
  <template v-if="!codeSent">
    <LoginForm v-model:email="email" :pending="pending" :failed="sendFailed" @submit="submit" />
    <DemoModeEntry class="mt-4" />
  </template>
  <LoginCodeEntry
    v-else
    v-model:code="code"
    :email="email"
    :pending="pending"
    :failure="codeFailure"
    :send-failed="sendFailed"
    @submit="submitCode"
    @resend="resend"
    @use-different-email="reset"
  />
</template>
