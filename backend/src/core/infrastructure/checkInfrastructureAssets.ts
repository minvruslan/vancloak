import { assertInfrastructureAssetsExist } from "@vancloak/infrastructure"
import { startupLogger } from "@/core/logger/index.js"

export async function checkInfrastructureAssets() {
  await assertInfrastructureAssetsExist()
  startupLogger.info("Infrastructure assets ok.")
}
