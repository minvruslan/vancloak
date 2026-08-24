<script setup lang="ts">
const { scrollElement, canScrollDown } = useScrollOverflow()
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="px-7 pt-7 max-sm:px-4.5 max-sm:pt-4.5">
      <slot name="header" />
    </div>

    <div class="relative flex min-h-0 flex-1 flex-col">
      <div
        ref="scrollElement"
        class="min-h-0 flex-1 overflow-y-auto px-7 pb-4 max-sm:px-4.5 sm:pb-4.5"
      >
        <slot />
      </div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-card to-transparent transition-opacity duration-300"
        :class="canScrollDown ? 'opacity-100' : 'opacity-0'"
      />
    </div>

    <div v-if="$slots.footer" class="px-7 pb-7 max-sm:px-4.5 max-sm:pb-4.5">
      <slot name="footer" />
    </div>
  </div>
</template>
