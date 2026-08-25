import { resolve } from "node:path"
import { z } from "zod"
import {
  Amneziawg2EndpointActualStateSchema,
  Amneziawg2EndpointDesiredStateSchema,
  Amneziawg2KeySchema,
  Amneziawg2ObfuscationOptionsSchema,
  buildAmneziawg2ConfigName,
  IpSchema,
  PortSchema,
  type Amneziawg2ClientIdentifier,
  type Amneziawg2ConfigData,
  type Amneziawg2EndpointActualState,
  type Amneziawg2EndpointDesiredState,
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
import { TunnelMtu } from "./constants/index.js"
import type { Amneziawg2Access } from "./types/index.js"
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

const AMNEZIAWG2_DIRECTORY_PATH = resolve(
  InfrastructureAssetsDirectoryPath,
  "remote-server",
  "protocols",
  "amneziawg2",
)
const AMNEZIAWG2_ANSIBLE_ROLE_DIRECTORY_PATH = resolve(AMNEZIAWG2_DIRECTORY_PATH, "ansible")
const AMNEZIAWG2_SCRIPTS_DIRECTORY_PATH = resolve(AMNEZIAWG2_DIRECTORY_PATH, "scripts")
const AMNEZIAWG2_APPLY_PEERS_SCRIPT_PATH = resolve(
  AMNEZIAWG2_SCRIPTS_DIRECTORY_PATH,
  "apply-peers.sh",
)
const AMNEZIAWG2_DELETE_PEERS_SCRIPT_PATH = resolve(
  AMNEZIAWG2_SCRIPTS_DIRECTORY_PATH,
  "delete-peers.sh",
)
const AMNEZIAWG2_LIST_ALLOWED_IPS_SCRIPT_PATH = resolve(
  AMNEZIAWG2_SCRIPTS_DIRECTORY_PATH,
  "list-allowed-ips.sh",
)
const AMNEZIAWG2_PROTOCOL_CODE = "amneziawg2" satisfies ProtocolCode
const AMNEZIAWG2_DOCKER_IMAGE_VERSION = "0.2.19"
const AMNEZIAWG2_CONTAINER_NAME = "amneziawg2"
const AMNEZIAWG2_DIRECTORY_NAME = AMNEZIAWG2_PROTOCOL_CODE
const AMNEZIAWG2_STATE_DIRECTORY_NAME = "state"
const AMNEZIAWG2_CONTAINER_STATE_DIRECTORY_PATH = "/opt/amneziawg2"
const AMNEZIAWG2_INTERFACE_NAME = "wg0"
const AMNEZIAWG2_SUBNET = "10.121.0.0/16"

export class Amneziawg2Client {
  readonly protocolCode = AMNEZIAWG2_PROTOCOL_CODE
  readonly dockerImageVersion = AMNEZIAWG2_DOCKER_IMAGE_VERSION

  private readonly remoteCommandRunner: RemoteCommandRunner

  constructor(remoteCommandRunner: RemoteCommandRunner) {
    this.remoteCommandRunner = remoteCommandRunner
  }

  private parseEndpointDesiredState(
    desiredState: EndpointDesiredState,
  ): Amneziawg2EndpointDesiredState {
    return Amneziawg2EndpointDesiredStateSchema.parse(desiredState)
  }

  private parseEndpointActualState(
    actualState: EndpointActualState,
  ): Amneziawg2EndpointActualState {
    return Amneziawg2EndpointActualStateSchema.parse(actualState)
  }

  createEndpointDesiredState(
    port: number,
    host: string,
    dns: string,
  ): Amneziawg2EndpointDesiredState {
    const parsedPort = PortSchema.parse(port)
    const serverKeyPair = generateKeyPair()
    const mtu = TunnelMtu

    return Amneziawg2EndpointDesiredStateSchema.parse({
      protocolCode: this.protocolCode,
      host: Amneziawg2EndpointDesiredStateSchema.shape.host.parse(host),
      dns: Amneziawg2EndpointDesiredStateSchema.shape.dns.parse(dns),
      dockerImageVersion: this.dockerImageVersion,
      port: parsedPort,
      containerName: AMNEZIAWG2_CONTAINER_NAME,
      directoryName: AMNEZIAWG2_DIRECTORY_NAME,
      stateDirectoryName: AMNEZIAWG2_STATE_DIRECTORY_NAME,
      containerStateDirectoryPath: AMNEZIAWG2_CONTAINER_STATE_DIRECTORY_PATH,
      interfaceName: AMNEZIAWG2_INTERFACE_NAME,
      subnet: AMNEZIAWG2_SUBNET,
      mtu,
      serverPrivateKey: serverKeyPair.privateKey,
      serverPublicKey: serverKeyPair.publicKey,
      obfuscation: generateEndpointObfuscation(mtu),
    } satisfies Amneziawg2EndpointDesiredState)
  }

  allocateClientIdentifier(
    endpointActualState: EndpointActualState,
    reservedClientIdentifiers: (string | null)[],
  ): Amneziawg2ClientIdentifier | null {
    const actualState = this.parseEndpointActualState(endpointActualState)
    return pickFreeClientIp(reservedClientIdentifiers, actualState.subnet)
  }

  createInitialConfigData(
    clientIdentifier: ConfigClientIdentifier,
    protocolOptions: ConfigProtocolOptions,
  ): Amneziawg2ConfigData {
    return {
      protocolCode: this.protocolCode,
      clientIp: IpSchema.parse(clientIdentifier),
      options: Amneziawg2ObfuscationOptionsSchema.parse(protocolOptions),
    }
  }

  async install(
    server: { desiredState: ServerDesiredState },
    endpointDesiredState: EndpointDesiredState,
    configDatas: (ConfigData | null)[],
  ): Promise<void> {
    const desiredState = this.parseEndpointDesiredState(endpointDesiredState)
    const deployDirectoryPath = `${server.desiredState.baseDirectory}/${desiredState.directoryName}`

    await this.remoteCommandRunner.runAnsibleRole(AMNEZIAWG2_ANSIBLE_ROLE_DIRECTORY_PATH, {
      service_username: server.desiredState.ssh.username,
      amneziawg2_docker_image_version: desiredState.dockerImageVersion,
      amneziawg2_port: desiredState.port,
      amneziawg2_mtu: desiredState.mtu,
      amneziawg2_address: buildServerAddress(desiredState.subnet),
      amneziawg2_deploy_directory_path: deployDirectoryPath,
      amneziawg2_state_directory_path: `${deployDirectoryPath}/${desiredState.stateDirectoryName}`,
      amneziawg2_container_state_directory_path: desiredState.containerStateDirectoryPath,
      amneziawg2_container_name: desiredState.containerName,
      amneziawg2_interface_name: desiredState.interfaceName,
      amneziawg2_server_private_key: desiredState.serverPrivateKey,
      amneziawg2_server_public_key: desiredState.serverPublicKey,
      amneziawg2_obfuscation: desiredState.obfuscation,
      amneziawg2_peers: createAccessesFromConfigDatas(configDatas),
    })
  }

  async createAccess(
    endpointActualState: EndpointActualState,
    clientIdentifier: ConfigClientIdentifier,
    protocolOptions: ConfigProtocolOptions,
    displayName: string,
  ): Promise<{
    configData: Amneziawg2ConfigData
    clientConfiguration: string
    clientConfigurationLink: string
  }> {
    const actualState = this.parseEndpointActualState(endpointActualState)
    const obfuscationOptions = Amneziawg2ObfuscationOptionsSchema.parse(protocolOptions)
    const clientIp = IpSchema.parse(clientIdentifier)

    const clientKeyPair = generateKeyPair()
    const presharedKey = generatePresharedKey()
    const clientObfuscation = generateClientObfuscation(actualState.mtu, obfuscationOptions)

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
    })

    const clientConfigurationLink = buildClientConfigurationLink({
      displayName: buildAmneziawg2ConfigName(displayName, obfuscationOptions),
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
    })

    await this.applyAccesses(actualState, [
      { publicKey: clientKeyPair.publicKey, presharedKey, clientIp },
    ])

    return {
      configData: {
        ...this.createInitialConfigData(clientIdentifier, protocolOptions),
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
    accesses: Amneziawg2Access[],
  ): Promise<void> {
    if (accesses.length === 0) return

    const actualState = this.parseEndpointActualState(endpointActualState)

    const lines = accesses.map((access) => {
      const publicKey = Amneziawg2KeySchema.parse(access.publicKey)
      const presharedKey = Amneziawg2KeySchema.parse(access.presharedKey)
      const clientIp = IpSchema.parse(access.clientIp)
      return `${publicKey} ${presharedKey} ${clientIp}\n`
    })

    await this.remoteCommandRunner.executeScriptInContainer(
      actualState.containerName,
      AMNEZIAWG2_APPLY_PEERS_SCRIPT_PATH,
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
      AMNEZIAWG2_LIST_ALLOWED_IPS_SCRIPT_PATH,
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
    endpointActualState: Amneziawg2EndpointActualState,
    clientPublicKeys: string[],
  ): Promise<void> {
    if (clientPublicKeys.length === 0) return

    const parsedClientPublicKeys = z.array(Amneziawg2KeySchema).parse(clientPublicKeys)

    await this.remoteCommandRunner.executeScriptInContainer(
      endpointActualState.containerName,
      AMNEZIAWG2_DELETE_PEERS_SCRIPT_PATH,
      this.buildContainerEnvironment(endpointActualState),
      parsedClientPublicKeys.map((clientPublicKey) => `${clientPublicKey}\n`).join(""),
    )
  }

  private buildContainerEnvironment(
    endpointActualState: Amneziawg2EndpointActualState,
  ): Record<string, string> {
    return {
      INTERFACE: endpointActualState.interfaceName,
      CONFIGURATION_FILE: `${endpointActualState.containerStateDirectoryPath}/${endpointActualState.interfaceName}.conf`,
    }
  }
}
