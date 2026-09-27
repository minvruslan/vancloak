import { requestLoginCode, verifyLoginCode } from "../services"
import type { VerifyLoginCodeFailure } from "../types/VerifyLoginCodeFailure"

export function useLogin() {
  const { isLoggedIn, isAdmin, refresh } = useAuthSession()
  const email = ref("")
  const code = ref("")
  const pending = ref(false)
  const codeSent = ref(false)
  const codeFailure = ref<VerifyLoginCodeFailure | null>(null)
  const sendFailed = ref(false)

  async function submit(): Promise<boolean> {
    pending.value = true
    sendFailed.value = false
    try {
      await requestLoginCode(email.value)
      codeSent.value = true
      return true
    } catch {
      sendFailed.value = true
      return false
    } finally {
      pending.value = false
    }
  }

  async function submitCode(): Promise<void> {
    if (pending.value) return
    pending.value = true
    codeFailure.value = null
    try {
      const failure = await verifyLoginCode(email.value, code.value)
      if (failure) {
        codeFailure.value = failure
        code.value = ""
        return
      }
      await refresh()
      if (!isLoggedIn.value) {
        codeFailure.value = "invalidCode"
        code.value = ""
        return
      }
      await navigateTo(isAdmin.value ? "/admin" : "/app")
    } catch {
      codeFailure.value = "invalidCode"
      code.value = ""
    } finally {
      pending.value = false
    }
  }

  async function resend(): Promise<void> {
    if (pending.value) return
    code.value = ""
    codeFailure.value = null
    await submit()
  }

  function reset() {
    codeSent.value = false
    code.value = ""
    codeFailure.value = null
    sendFailed.value = false
  }

  return {
    email,
    code,
    pending,
    codeSent,
    codeFailure,
    sendFailed,
    submit,
    submitCode,
    resend,
    reset,
  }
}
