import { resolve } from "node:path"
import { z } from "zod"
import {
  Amneziawg3EndpointActualStateSchema,
  Amneziawg3EndpointDesiredStateSchema,
  Amneziawg3KeySchema,
  Amneziawg3ObfuscationOptionsSchema,
  buildAmneziawg3ConfigName,
  IpSchema,
  PortSchema,
  SplitTunnelingAllowedIps,
  SplitTunnelingSchema,
  type Amneziawg3ClientIdentifier,
  type Amneziawg3ConfigData,
  type Amneziawg3EndpointActualState,
  type Amneziawg3EndpointDesiredState,
  type ConfigClientIdentifier,
  type ConfigData,
  type ConfigProtocolOptions,
  type EndpointActualState,
  type EndpointDesiredState,
  type ProtocolCode,
  type ServerDesiredState,
} from "../../../shared/index.js"
import { InfrastructureAssetsDirectoryPath } from "../../../assets/index.js"
import type { RemoteCommandRunner } from "../../../remote-command-runner/index.js"
import { AllowedIps, TunnelMtu } from "./constants/index.js"
import type { Amneziawg3Access } from "./types/index.js"
import {
  buildClientConfiguration,
  buildClientConfigurationLink,
  buildServerAddress,
  createAccessesFromConfigDatas,
  findClientPublicKeyByClientIp,
  generateClientObfuscation,
  generateEndpointObfuscation,
  generateKeyPair,
  generatePresharedKey,
  pickFreeClientIp,
} from "./utils/index.js"

const AMNEZIAWG3_DIRECTORY_PATH = resolve(
  InfrastructureAssetsDirectoryPath,
  "remote-server",
  "protocols",
  "amneziawg3",
)
const AMNEZIAWG3_ANSIBLE_ROLE_DIRECTORY_PATH = resolve(AMNEZIAWG3_DIRECTORY_PATH, "ansible")
const AMNEZIAWG3_SCRIPTS_DIRECTORY_PATH = resolve(AMNEZIAWG3_DIRECTORY_PATH, "scripts")
const AMNEZIAWG3_APPLY_PEERS_SCRIPT_PATH = resolve(
  AMNEZIAWG3_SCRIPTS_DIRECTORY_PATH,
  "apply-peers.sh",
)
const AMNEZIAWG3_DELETE_PEERS_SCRIPT_PATH = resolve(
  AMNEZIAWG3_SCRIPTS_DIRECTORY_PATH,
  "delete-peers.sh",
)
const AMNEZIAWG3_LIST_ALLOWED_IPS_SCRIPT_PATH = resolve(
  AMNEZIAWG3_SCRIPTS_DIRECTORY_PATH,
  "list-allowed-ips.sh",
)
const AMNEZIAWG3_PROTOCOL_CODE = "amneziawg3" satisfies ProtocolCode
const AMNEZIAWG3_DOCKER_IMAGE_VERSION = "3.1.20260814"
const AMNEZIAWG3_CONTAINER_NAME = "amneziawg3"
const AMNEZIAWG3_DIRECTORY_NAME = AMNEZIAWG3_PROTOCOL_CODE
const AMNEZIAWG3_STATE_DIRECTORY_NAME = "state"
const AMNEZIAWG3_CONTAINER_STATE_DIRECTORY_PATH = "/opt/amneziawg3"
const AMNEZIAWG3_INTERFACE_NAME = "wg0"
const AMNEZIAWG3_SUBNET = "10.121.0.0/16"

export class Amneziawg3Client {
  readonly protocolCode = AMNEZIAWG3_PROTOCOL_CODE
  readonly dockerImageVersion = AMNEZIAWG3_DOCKER_IMAGE_VERSION

  private readonly remoteCommandRunner: RemoteCommandRunner

  constructor(remoteCommandRunner: RemoteCommandRunner) {
    this.remoteCommandRunner = remoteCommandRunner
  }

  private parseEndpointDesiredState(
    desiredState: EndpointDesiredState,
  ): Amneziawg3EndpointDesiredState {
    return Amneziawg3EndpointDesiredStateSchema.parse(desiredState)
  }

  private parseEndpointActualState(
    actualState: EndpointActualState,
  ): Amneziawg3EndpointActualState {
    return Amneziawg3EndpointActualStateSchema.parse(actualState)
  }

  createEndpointDesiredState(
    port: number,
    host: string,
    dns: string,
  ): Amneziawg3EndpointDesiredState {
    const parsedPort = PortSchema.parse(port)
    const serverKeyPair = generateKeyPair()
    const mtu = TunnelMtu

    return Amneziawg3EndpointDesiredStateSchema.parse({
      protocolCode: this.protocolCode,
      host: Amneziawg3EndpointDesiredStateSchema.shape.host.parse(host),
      dns: Amneziawg3EndpointDesiredStateSchema.shape.dns.parse(dns),
      dockerImageVersion: this.dockerImageVersion,
      port: parsedPort,
      containerName: AMNEZIAWG3_CONTAINER_NAME,
      directoryName: AMNEZIAWG3_DIRECTORY_NAME,
      stateDirectoryName: AMNEZIAWG3_STATE_DIRECTORY_NAME,
      containerStateDirectoryPath: AMNEZIAWG3_CONTAINER_STATE_DIRECTORY_PATH,
      interfaceName: AMNEZIAWG3_INTERFACE_NAME,
      subnet: AMNEZIAWG3_SUBNET,
      mtu,
      serverPrivateKey: serverKeyPair.privateKey,
      serverPublicKey: serverKeyPair.publicKey,
      obfuscation: generateEndpointObfuscation(mtu),
    } satisfies Amneziawg3EndpointDesiredState)
  }

  allocateClientIdentifier(
    endpointActualState: EndpointActualState,
    reservedClientIdentifiers: (string | null)[],
  ): Amneziawg3ClientIdentifier | null {
    const actualState = this.parseEndpointActualState(endpointActualState)
    return pickFreeClientIp(reservedClientIdentifiers, actualState.subnet)
  }

  createInitialConfigData(
    clientIdentifier: ConfigClientIdentifier,
    protocolOptions: ConfigProtocolOptions,
  ): Amneziawg3ConfigData {
    return {
      protocolCode: this.protocolCode,
      clientIp: IpSchema.parse(clientIdentifier),
      splitTunneling: SplitTunnelingSchema.enum.ru,
      options: Amneziawg3ObfuscationOptionsSchema.parse(protocolOptions),
    }
  }

  async install(
    server: { desiredState: ServerDesiredState },
    endpointDesiredState: EndpointDesiredState,
    configDatas: (ConfigData | null)[],
  ): Promise<void> {
    const desiredState = this.parseEndpointDesiredState(endpointDesiredState)
    const deployDirectoryPath = `${server.desiredState.baseDirectory}/${desiredState.directoryName}`

    await this.remoteCommandRunner.runAnsibleRole(AMNEZIAWG3_ANSIBLE_ROLE_DIRECTORY_PATH, {
      service_username: server.desiredState.ssh.username,
      amneziawg3_docker_image_version: desiredState.dockerImageVersion,
      amneziawg3_port: desiredState.port,
      amneziawg3_mtu: desiredState.mtu,
      amneziawg3_address: buildServerAddress(desiredState.subnet),
      amneziawg3_deploy_directory_path: deployDirectoryPath,
      amneziawg3_state_directory_path: `${deployDirectoryPath}/${desiredState.stateDirectoryName}`,
      amneziawg3_container_state_directory_path: desiredState.containerStateDirectoryPath,
      amneziawg3_container_name: desiredState.containerName,
      amneziawg3_interface_name: desiredState.interfaceName,
      amneziawg3_server_private_key: desiredState.serverPrivateKey,
      amneziawg3_server_public_key: desiredState.serverPublicKey,
      amneziawg3_obfuscation: desiredState.obfuscation,
      amneziawg3_peers: createAccessesFromConfigDatas(configDatas),
    })
  }

  async createAccess(
    endpointActualState: EndpointActualState,
    clientIdentifier: ConfigClientIdentifier,
    protocolOptions: ConfigProtocolOptions,
    displayName: string,
  ): Promise<{
    configData: Amneziawg3ConfigData
    clientConfiguration: string
    clientConfigurationLink: string
  }> {
    const actualState = this.parseEndpointActualState(endpointActualState)
    const obfuscationOptions = Amneziawg3ObfuscationOptionsSchema.parse(protocolOptions)
    const clientIp = IpSchema.parse(clientIdentifier)

    const clientKeyPair = generateKeyPair()
    const presharedKey = generatePresharedKey()
    const clientObfuscation = generateClientObfuscation(actualState.mtu, obfuscationOptions)

    const initialConfigData = this.createInitialConfigData(clientIdentifier, protocolOptions)
    const allowedIps = initialConfigData.splitTunneling
      ? SplitTunnelingAllowedIps[initialConfigData.splitTunneling]
      : AllowedIps

    const clientConfiguration = buildClientConfiguration({
      clientPrivateKey: clientKeyPair.privateKey,
      clientIp,
      serverPublicKey: actualState.serverPublicKey,
      presharedKey,
      serverEndpoint: `${actualState.host}:${actualState.port}`,
      mtu: actualState.mtu,
      serverObfuscation: actualState.obfuscation,
      clientObfuscation,
      dns: actualState.dns,
      allowedIps,
    })

    const clientConfigurationLink = buildClientConfigurationLink({
      displayName: buildAmneziawg3ConfigName(displayName),
      clientConfiguration,
      clientPrivateKey: clientKeyPair.privateKey,
      clientIp,
      serverPublicKey: actualState.serverPublicKey,
      presharedKey,
      host: actualState.host,
      port: actualState.port,
      dns: actualState.dns,
      mtu: actualState.mtu,
      serverObfuscation: actualState.obfuscation,
      clientObfuscation,
      allowedIps,
    })

    await this.applyAccesses(actualState, [
      { publicKey: clientKeyPair.publicKey, presharedKey, clientIp },
    ])

    return {
      configData: {
        ...initialConfigData,
        publicKey: clientKeyPair.publicKey,
        presharedKey,
        serverPublicKey: actualState.serverPublicKey,
        host: actualState.host,
        port: actualState.port,
        dns: actualState.dns,
        mtu: actualState.mtu,
        serverObfuscation: actualState.obfuscation,
        clientObfuscation,
      },
      clientConfiguration,
      clientConfigurationLink,
    }
  }

  async applyAccesses(
    endpointActualState: EndpointActualState,
    accesses: Amneziawg3Access[],
  ): Promise<void> {
    if (accesses.length === 0) return

    const actualState = this.parseEndpointActualState(endpointActualState)

    const lines = accesses.map((access) => {
      const publicKey = Amneziawg3KeySchema.parse(access.publicKey)
      const presharedKey = Amneziawg3KeySchema.parse(access.presharedKey)
      const clientIp = IpSchema.parse(access.clientIp)
      return `${publicKey} ${presharedKey} ${clientIp}\n`
    })

    await this.remoteCommandRunner.executeScriptInContainer(
      actualState.containerName,
      AMNEZIAWG3_APPLY_PEERS_SCRIPT_PATH,
      this.buildContainerEnvironment(actualState),
      lines.join(""),
    )
  }

  async deleteAccessByClientIdentifier(
    endpointActualState: EndpointActualState,
    clientIdentifier: ConfigClientIdentifier,
  ): Promise<void> {
    const actualState = this.parseEndpointActualState(endpointActualState)

    const allowedIpsOutput = await this.remoteCommandRunner.executeScriptInContainer(
      actualState.containerName,
      AMNEZIAWG3_LIST_ALLOWED_IPS_SCRIPT_PATH,
      this.buildContainerEnvironment(actualState),
    )
    const clientPublicKey = findClientPublicKeyByClientIp(
      allowedIpsOutput,
      IpSchema.parse(clientIdentifier),
    )

    if (!clientPublicKey) return

    await this.deleteClientPublicKeys(actualState, [clientPublicKey])
  }

  async deleteAccesses(
    endpointActualState: EndpointActualState,
    configDatas: (ConfigData | null)[],
  ): Promise<void> {
    const actualState = this.parseEndpointActualState(endpointActualState)

    await this.deleteClientPublicKeys(
      actualState,
      createAccessesFromConfigDatas(configDatas).map((access) => access.publicKey),
    )
  }

  private async deleteClientPublicKeys(
    endpointActualState: Amneziawg3EndpointActualState,
    clientPublicKeys: string[],
  ): Promise<void> {
    if (clientPublicKeys.length === 0) return

    const parsedClientPublicKeys = z.array(Amneziawg3KeySchema).parse(clientPublicKeys)

    await this.remoteCommandRunner.executeScriptInContainer(
      endpointActualState.containerName,
      AMNEZIAWG3_DELETE_PEERS_SCRIPT_PATH,
      this.buildContainerEnvironment(endpointActualState),
      parsedClientPublicKeys.map((clientPublicKey) => `${clientPublicKey}\n`).join(""),
    )
  }

  private buildContainerEnvironment(
    endpointActualState: Amneziawg3EndpointActualState,
  ): Record<string, string> {
    return {
      INTERFACE: endpointActualState.interfaceName,
      CONFIGURATION_FILE: `${endpointActualState.containerStateDirectoryPath}/${endpointActualState.interfaceName}.conf`,
    }
  }
}
