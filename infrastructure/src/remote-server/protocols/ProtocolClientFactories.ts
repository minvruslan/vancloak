import type { ProtocolCode } from "../../shared/index.js"
import type { RemoteCommandRunner } from "../../remote-command-runner/index.js"
import { Amneziawg3Client } from "./amneziawg3/index.js"

export const ProtocolClientFactories = {
  amneziawg3: (remoteCommandRunner: RemoteCommandRunner) =>
    new Amneziawg3Client(remoteCommandRunner),
} as const satisfies Record<ProtocolCode, (remoteCommandRunner: RemoteCommandRunner) => unknown>
