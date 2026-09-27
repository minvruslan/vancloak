import { vi } from "vitest"

vi.mock("@/core/mailer/index.js", () => ({ sendLoginCodeEmail: vi.fn() }))
