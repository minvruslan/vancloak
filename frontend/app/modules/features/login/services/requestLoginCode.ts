export async function requestLoginCode(email: string): Promise<void> {
  const { $authClient } = useNuxtApp()
  const { error } = await $authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })
  if (error) throw new Error(error.message ?? "login-code request failed")
}
