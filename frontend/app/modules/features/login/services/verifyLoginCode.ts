import type { VerifyLoginCodeFailure } from "../types/VerifyLoginCodeFailure"

export async function verifyLoginCode(
  email: string,
  code: string,
): Promise<VerifyLoginCodeFailure | null> {
  const { $authClient } = useNuxtApp()
  const { error } = await $authClient.signIn.emailOtp({ email, otp: code })
  if (!error) return null
  if (error.status === 429) return "rateLimited"
  if (error.code === "TOO_MANY_ATTEMPTS") return "tooManyAttempts"
  return "invalidCode"
}
