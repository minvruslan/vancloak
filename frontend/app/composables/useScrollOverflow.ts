import { useEventListener, useResizeObserver } from "@vueuse/core"

export const useScrollOverflow = () => {
  const scrollElement = ref<HTMLElement | null>(null)
  const canScrollDown = ref(false)

  const update = () => {
    const element = scrollElement.value
    canScrollDown.value = element
      ? element.scrollTop + element.clientHeight < element.scrollHeight - 1
      : false
  }

  useEventListener(scrollElement, "scroll", update, { passive: true })
  useResizeObserver(scrollElement, update)
  onMounted(update)

  return { scrollElement, canScrollDown }
}
