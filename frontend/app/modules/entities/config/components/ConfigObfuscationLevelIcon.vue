<script setup lang="ts">
import type { Component } from "vue"
import { computed } from "vue"
import { Ghost, Scale, SlidersHorizontal } from "@lucide/vue"
import type { Amneziawg3ConfigObfuscationLevel } from "@vancloak/api-contract"

const props = defineProps<{ level: Amneziawg3ConfigObfuscationLevel }>()

const IconByLevel: Record<Amneziawg3ConfigObfuscationLevel, Component> = {
  medium: Scale,
  high: Ghost,
  custom: SlidersHorizontal,
}

const icon = computed(() => IconByLevel[props.level])
</script>

<template>
  <component :is="icon" aria-hidden="true" />
</template>
