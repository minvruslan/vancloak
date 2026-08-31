<script setup lang="ts">
import DemoModeEntry from "./DemoModeEntry.vue"
import { useLogin } from "../composables/useLogin"
import LoginForm from "./LoginForm.vue"
import LoginEmailSent from "./LoginEmailSent.vue"

const { email, pending, magicLinkSent, submit, reset } = useLogin()
</script>

<template>
  <template v-if="!magicLinkSent">
    <LoginForm v-model:email="email" :pending="pending" @submit="submit" />
    <DemoModeEntry class="mt-4" />
  </template>
  <LoginEmailSent v-else :email="email" @use-different-email="reset" />
</template>
