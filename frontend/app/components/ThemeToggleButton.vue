<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { Moon, Sun } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { messages } from "@/translations/ThemeSwitcher"

const { t } = useI18n({ useScope: "local", messages })
const colorMode = useColorMode()

const mounted = ref(false)
onMounted(() => (mounted.value = true))

const current = computed(() => (mounted.value ? colorMode.value : undefined))
const icon = computed(() => (current.value === "dark" ? Moon : Sun))

const toggle = () => {
  colorMode.preference = current.value === "dark" ? "light" : "dark"
}
</script>

<template>
  <Button type="button" variant="ghost" size="icon" @click="toggle">
    <component :is="icon" class="size-4 text-muted-foreground" aria-hidden="true" />
    <span class="sr-only">{{ t("label") }}</span>
  </Button>
</template>
