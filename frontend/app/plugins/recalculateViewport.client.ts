export default defineNuxtPlugin(() => {
  const forceViewportRecalculation = () => {
    requestAnimationFrame(() => {
      const root = document.documentElement
      root.style.minHeight = "0.1px"
      void root.offsetHeight
      root.style.minHeight = ""
    })
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") forceViewportRecalculation()
  })

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) forceViewportRecalculation()
  })

  let resetScrollTimer: ReturnType<typeof setTimeout> | undefined

  const resetLeftoverScroll = () => {
    clearTimeout(resetScrollTimer)
    resetScrollTimer = setTimeout(() => {
      const viewport = window.visualViewport
      if (!viewport) return
      const root = document.documentElement
      const keyboardClosed = viewport.height >= root.clientHeight - 2
      const pageLeftShifted = root.scrollTop !== 0 || viewport.offsetTop !== 0
      const nothingToScroll = root.scrollHeight <= root.clientHeight + 1
      if (keyboardClosed && pageLeftShifted && nothingToScroll) {
        root.scrollTo({ top: 0 })
      }
    }, 50)
  }

  window.visualViewport?.addEventListener("resize", resetLeftoverScroll)
  window.visualViewport?.addEventListener("scroll", resetLeftoverScroll)
})
