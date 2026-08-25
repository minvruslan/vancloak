import { Worker } from "bullmq"
import { workerLogger } from "@/core/logger/index.js"
import { queueConnection } from "@/core/queue/index.js"
import {
  ProvisionServerQueueName,
  type ProvisionServerJob,
} from "@/core/queue/provision-server/index.js"
import { provisionServerJob } from "./jobs/provision-server/provisionServerJob.js"
import { ProvisioningError } from "./jobs/provision-server/ProvisioningError.js"
import { updateServerStatus } from "./jobs/provision-server/queries/updateServerStatus.js"

export function createProvisioningWorker() {
  const worker = new Worker<ProvisionServerJob>(
    ProvisionServerQueueName,
    (job) => provisionServerJob(job.data),
    { connection: queueConnection, concurrency: 3 },
  )

  worker.on("failed", async (job, err) => {
    if (err instanceof ProvisioningError) {
      workerLogger.error(
        { serverId: err.serverId, errorCode: err.errorCode, error: err.error, jobId: job?.id },
        err.message,
      )
    } else {
      workerLogger.error({ error: err, jobId: job?.id }, "Job failed.")
    }

    if (!job) return

    if (job.finishedOn) {
      await updateServerStatus(job.data.serverId, "failed").catch((statusError) =>
        workerLogger.error(
          { error: statusError, serverId: job.data.serverId },
          "Failed to mark server as failed.",
        ),
      )
    }
  })

  worker.on("error", (err) => {
    workerLogger.error({ error: err }, "Worker error.")
  })

  return worker
}
