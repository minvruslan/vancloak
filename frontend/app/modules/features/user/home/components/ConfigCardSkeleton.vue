<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton"
</script>

<template>
  <div
    class="flex w-full shrink-0 items-center gap-3 rounded-lg border p-4 max-sm:gap-2.5 max-sm:px-3.5 max-sm:py-3"
  >
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex h-5 items-center"><Skeleton class="h-4 w-32" /></span>
      <span class="flex h-4 items-center"><Skeleton class="h-3 w-44" /></span>
    </span>
    <Skeleton class="h-6 w-24 rounded-full" />
  </div>
</template>
