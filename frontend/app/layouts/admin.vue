<script setup lang="ts">
import DesktopNav from "@/components/admin-layout/DesktopNav.vue"
import MobileNav from "@/components/admin-layout/MobileNav.vue"
</script>

<template>
  <div class="flex h-dvh flex-col bg-muted/50">
    <!-- Mobile -->
    <header class="z-30 shrink-0 border-b bg-background lg:hidden">
      <MobileNav />
    </header>

    <!-- Desktop -->
    <div class="mx-auto flex w-full min-h-0 max-w-295 flex-1 gap-7 px-4 py-6 lg:px-7 lg:py-7">
      <DesktopNav class="hidden lg:flex lg:flex-col" />

      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div class="mx-auto flex h-full max-w-215 flex-col">
          <NotificationBanner />
          <div class="min-h-0 flex-1">
            <slot />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
