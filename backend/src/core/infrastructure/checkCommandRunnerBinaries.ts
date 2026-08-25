import { assertCommandRunnerBinariesExist } from "@vancloak/infrastructure"
import { startupLogger } from "@/core/logger/index.js"

export async function checkCommandRunnerBinaries() {
  await assertCommandRunnerBinariesExist()
  startupLogger.info("Command runner binaries ok.")
}
