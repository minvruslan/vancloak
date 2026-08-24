import { z } from "zod"

export const WizardAppIdSchema = z.enum(["amneziavpn", "amneziawg", "defaultvpn"])
