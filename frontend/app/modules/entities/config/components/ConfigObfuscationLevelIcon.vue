<script setup lang="ts">
import type { Component } from "vue"
import { computed } from "vue"
import { Ghost, Scale, SlidersHorizontal } from "@lucide/vue"
import type { Amneziawg2ConfigObfuscationLevel } from "@vancloak/api-contract"

const props = defineProps<{ level: Amneziawg2ConfigObfuscationLevel }>()

const IconByLevel: Record<Amneziawg2ConfigObfuscationLevel, Component> = {
  medium: Scale,
  high: Ghost,
  custom: SlidersHorizontal,
}

const icon = computed(() => IconByLevel[props.level])
</script>

<template>
  <component :is="icon" aria-hidden="true" />
</template>
