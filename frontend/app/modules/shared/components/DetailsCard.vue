<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="rounded-lg border">
    <div class="p-4">
      <span class="text-sm font-semibold">{{ title }}</span>
    </div>
    <div class="px-4 pb-4">
      <slot />
    </div>
  </div>
</template>
