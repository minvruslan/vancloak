import { Queue } from "bullmq"
import { queueConnection } from "../queueConnection.js"
import { ProvisionServerQueueName } from "./constants/index.js"
import type { ProvisionServerJob } from "./types/index.js"

let instance: Queue<ProvisionServerJob> | null = null

export function provisionServerQueue(): Queue<ProvisionServerJob> {
  return (instance ??= new Queue<ProvisionServerJob>(ProvisionServerQueueName, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true,
      removeOnFail: { age: 60 * 60, count: 5 },
    },
  }))
}
