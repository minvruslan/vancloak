<script setup lang="ts">
import UserMenu from "@/components/user-layout/UserMenu.vue"
import { BrandIconWithText } from "@/modules/entities/brand"

const { locked: navigationLocked } = useNavigationLock()

const onBrandClick = (event: MouseEvent) => {
  if (navigationLocked.value) event.preventDefault()
}
</script>

<template>
  <div class="flex h-dvh flex-col bg-muted/50 sm:justify-center">
    <div class="mx-auto w-full max-w-140 px-5 pt-5 max-sm:px-3.5 max-sm:pt-3">
      <header
        class="flex items-center justify-between gap-3 rounded-xl border bg-card py-2.5 pl-4.5 pr-2.5 max-sm:py-2 max-sm:pl-3.5 max-sm:pr-2"
      >
        <NuxtLink
          to="/app"
          class="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          :aria-disabled="navigationLocked || undefined"
          @click.capture="onBrandClick"
        >
          <BrandIconWithText />
        </NuxtLink>
        <UserMenu />
      </header>
    </div>

    <main
      class="mx-auto flex min-h-0 w-full max-w-140 flex-1 flex-col px-5 pt-4 pb-5 max-sm:px-3.5 max-sm:pt-4 max-sm:pb-3.5 sm:max-h-160"
    >
      <NotificationBanner />
      <div class="flex min-h-0 flex-1 flex-col gap-4">
        <slot />
      </div>
    </main>
  </div>
</template>
