<script setup lang="ts">
import type { Config } from "@vancloak/api-contract"
import { onMounted } from "vue"
import { clearCreateConfigWizardStorage } from "@/modules/features/user/create-config"
import { UserHome } from "@/modules/features/user/home"

definePageMeta({
  middleware: "user",
  layout: "user",
  pageTransition: { name: "page", mode: "out-in" },
})

onMounted(() => clearCreateConfigWizardStorage())

const onOpen = (config: Config) => navigateTo(`/app/configs/${config.id}`)
const onCreate = () => navigateTo("/app/configs/create")
</script>

<template>
  <UserHome @open="onOpen" @create="onCreate" />
</template>
