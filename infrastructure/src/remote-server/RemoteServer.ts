import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { z } from "zod"
import {
  IpSchema,
  PortSchema,
  ServerDesiredStateSchema,
  TransportProtocolSchema,
  UnixPathSchema,
  UnixUsernameSchema,
  type ServerAccess,
  type ServerData,
  type ProtocolCode,
  type TransportProtocol,
} from "../shared/index.js"
import { ProjectName } from "../shared/index.js"
import { InfrastructureAssetsDirectoryPath } from "../assets/index.js"
import { CommandRunner, resolveCommandRunnerPath } from "../command-runner/index.js"
import { RemoteCommandRunner } from "../remote-command-runner/index.js"
import { ProtocolClientFactories } from "./protocols/index.js"
import type { ProtocolClientByCode } from "./protocols/index.js"

const ANSIBLE_DIRECTORY_PATH = resolve(
  InfrastructureAssetsDirectoryPath,
  "remote-server",
  "ansible",
)
const SSH_KEYSCAN_TIMEOUT_SECONDS = 15
const SSH_PRIVATE_KEY_MOUNT_PATH = "/ssh-private-key"

export class RemoteServer {
  private readonly remoteCommandRunner: RemoteCommandRunner

  constructor(serverAccess: ServerAccess) {
    this.remoteCommandRunner = new RemoteCommandRunner(serverAccess)
  }

  static buildServerAccessFromActualState(
    server: { ip: string; data: ServerData },
    appSshPrivateKey: string,
  ): ServerAccess | null {
    const sshHostKeys = server.data.facts?.sshHostKeys
    if (!sshHostKeys?.length) return null

    const ssh = server.data.actualState.ssh
    if (ssh.type === "password") {
      return {
        ip: server.ip,
        port: ssh.port,
        username: ssh.username,
        password: ssh.password,
        sshHostKeys,
      }
    }

    return {
      ip: server.ip,
      port: ssh.port,
      username: ssh.username,
      privateKey: appSshPrivateKey,
      sshHostKeys,
    }
  }

  static buildServerAccessFromDesiredState(
    server: { ip: string; data: ServerData },
    appSshPrivateKey: string,
  ): ServerAccess | null {
    const desiredState = ServerDesiredStateSchema.safeParse(server.data.desiredState)
    const sshHostKeys = server.data.facts?.sshHostKeys
    if (!desiredState.success || !sshHostKeys?.length) return null

    const ssh = desiredState.data.ssh
    if (ssh.type !== "privateKey") return null

    return {
      ip: server.ip,
      port: ssh.port,
      username: ssh.username,
      privateKey: appSshPrivateKey,
      sshHostKeys,
    }
  }

  static async scanSshHostKeys(ip: string, port: number): Promise<string[]> {
    const parsedIp = IpSchema.parse(ip)
    const parsedPort = PortSchema.parse(port)

    const stdout = await CommandRunner.run(
      [],
      [
        "ssh-keyscan",
        "-T",
        String(SSH_KEYSCAN_TIMEOUT_SECONDS),
        "-p",
        String(parsedPort),
        parsedIp,
      ],
    )

    const sshHostKeys = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/).slice(1).join(" "))
      .sort()

    if (sshHostKeys.length === 0) {
      throw new Error(`SSH host key scan returned no keys for ${parsedIp}.`)
    }

    return sshHostKeys
  }

  static async deriveSshPublicKey(privateKey: string): Promise<string> {
    const localTmpDirectory = await mkdtemp(join(tmpdir(), `${ProjectName}-ssh-public-key-`))

    try {
      const localPrivateKeyPath = join(localTmpDirectory, "private-key")
      await writeFile(localPrivateKeyPath, privateKey, { mode: 0o600 })

      const privateKeyFile = resolveCommandRunnerPath(
        localPrivateKeyPath,
        SSH_PRIVATE_KEY_MOUNT_PATH,
      )

      const stdout = await CommandRunner.run(privateKeyFile.mount, [
        "ssh-keygen",
        "-y",
        "-f",
        privateKeyFile.path,
      ])

      const publicKey = stdout.trim()
      if (!publicKey) {
        throw new Error("SSH public key derivation produced no output.")
      }

      return publicKey
    } finally {
      await rm(localTmpDirectory, { recursive: true, force: true })
    }
  }

  assertConnectivity(): Promise<void> {
    return this.remoteCommandRunner.assertConnectivity()
  }

  async assertPrivilegeEscalation(): Promise<void> {
    await this.remoteCommandRunner.execute("sudo -n true")
  }

  installDocker(): Promise<void> {
    return this.remoteCommandRunner.runAnsibleRole(
      join(ANSIBLE_DIRECTORY_PATH, "roles", "docker"),
      {},
    )
  }

  createServiceUser(serviceUsername: string, serviceBaseDirectory: string): Promise<void> {
    return this.remoteCommandRunner.runAnsibleRole(join(ANSIBLE_DIRECTORY_PATH, "roles", "user"), {
      service_username: UnixUsernameSchema.parse(serviceUsername),
      service_base_directory: UnixPathSchema.parse(serviceBaseDirectory),
    })
  }

  installServiceUserAuthorizedKeys(
    serviceUsername: string,
    authorizedKeys: string[],
  ): Promise<void> {
    return this.remoteCommandRunner.runAnsibleRole(
      join(ANSIBLE_DIRECTORY_PATH, "roles", "authorized-keys"),
      {
        service_username: UnixUsernameSchema.parse(serviceUsername),
        service_authorized_keys: z.array(z.string().min(1)).min(1).parse(authorizedKeys),
      },
    )
  }

  hardenSshAccess(sshPort: number): Promise<void> {
    return this.remoteCommandRunner.runAnsibleRole(
      join(ANSIBLE_DIRECTORY_PATH, "roles", "hardening"),
      {
        hardening_ssh_port: PortSchema.parse(sshPort),
      },
    )
  }

  allowFirewallPort(port: number, transportProtocol: TransportProtocol): Promise<void> {
    return this.remoteCommandRunner.runAnsibleRole(
      join(ANSIBLE_DIRECTORY_PATH, "roles", "firewall-allow-port"),
      {
        firewall_port: PortSchema.parse(port),
        firewall_transport_protocol: TransportProtocolSchema.parse(transportProtocol),
      },
    )
  }

  getProtocolClient<Code extends ProtocolCode>(protocolCode: Code): ProtocolClientByCode[Code] {
    return ProtocolClientFactories[protocolCode](this.remoteCommandRunner)
  }
}
