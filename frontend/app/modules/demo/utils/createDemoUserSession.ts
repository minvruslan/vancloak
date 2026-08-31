import type { UserSession } from "@vancloak/api-contract"

export function createDemoUserSession(): UserSession {
  return {
    id: crypto.randomUUID(),
    name: "Demo",
    email: "demo@vancloak.app",
    emailVerified: true,
    image: null,
    role: "user",
    banned: false,
  }
}
