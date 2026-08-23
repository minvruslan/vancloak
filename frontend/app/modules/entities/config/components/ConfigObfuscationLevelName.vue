<script setup lang="ts">
import type { Amneziawg2ConfigObfuscationLevel } from "@vancloak/api-contract"
import { messages } from "../translations/ConfigObfuscationLevelName"

defineProps<{ level: Amneziawg2ConfigObfuscationLevel }>()

const { t } = useI18n({ useScope: "local", messages })
</script>

<template>
  <span>{{ t(level) }}</span>
</template>
