<template>
  <main class="relative min-h-dvh w-full flex items-center justify-center bg-muted/50 p-6">
    <div class="absolute top-4 right-4 flex items-center gap-1">
      <ThemeToggleButton />
      <LanguageMenuButton />
    </div>
    <div class="w-full max-w-sm p-8">
      <slot />
    </div>
  </main>
</template>
