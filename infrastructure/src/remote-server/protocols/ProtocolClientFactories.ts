import type { ProtocolCode } from "../../shared/index.js"
import type { RemoteCommandRunner } from "../../remote-command-runner/index.js"
import { Amneziawg2Client } from "./amneziawg2/index.js"

export const ProtocolClientFactories = {
  amneziawg2: (remoteCommandRunner: RemoteCommandRunner) =>
    new Amneziawg2Client(remoteCommandRunner),
} as const satisfies Record<ProtocolCode, (remoteCommandRunner: RemoteCommandRunner) => unknown>
