import { RemoteServer, type ProtocolClient } from "@vancloak/infrastructure"
import {
  Amneziawg3ClientIdentifierSchema,
  Amneziawg3EndpointActualStateSchema,
  Amneziawg3ObfuscationDefaults,
  ProtocolCodeSchema,
  convertNumberToIp,
  parseIpSubnet,
  type Amneziawg3ConfigData,
} from "@vancloak/infrastructure/shared"
import { vi } from "vitest"

const FAKE_SERVER_SSH_HOST_KEY = "ssh-ed25519 AAAATestServerHostKey"

function createAmneziawg3Client(): ProtocolClient {
  return new RemoteServer({
    ip: "192.0.2.1",
    port: 22,
    username: "vancloak",
    privateKey: "fake-ssh-private-key",
    sshHostKeys: [FAKE_SERVER_SSH_HOST_KEY],
  }).getProtocolClient(ProtocolCodeSchema.enum.amneziawg3)
}

const FakeAmneziawg3EndpointActualState = Amneziawg3EndpointActualStateSchema.parse({
  ...createAmneziawg3Client().createEndpointDesiredState(51820, "192.0.2.1", "1.1.1.1"),
  appliedAt: "2026-01-01T00:00:00.000Z",
})

const FIRST_CLIENT_ADDRESS_OFFSET = 2

const FakeAmneziawg3FirstClientIp = Amneziawg3ClientIdentifierSchema.parse(
  convertNumberToIp(
    parseIpSubnet(FakeAmneziawg3EndpointActualState.subnet).networkNumber +
      FIRST_CLIENT_ADDRESS_OFFSET,
  ),
)

const FakeAmneziawg3CreateAccessResult = {
  configData: {
    ...createAmneziawg3Client().createInitialConfigData(FakeAmneziawg3FirstClientIp, {
      protocolCode: ProtocolCodeSchema.enum.amneziawg3,
      ...Amneziawg3ObfuscationDefaults,
    }),
    publicKey: "fake-public-key",
    presharedKey: "fake-preshared-key",
    serverPublicKey: FakeAmneziawg3EndpointActualState.serverPublicKey,
    host: FakeAmneziawg3EndpointActualState.host,
    port: FakeAmneziawg3EndpointActualState.port,
    dns: FakeAmneziawg3EndpointActualState.dns,
    mtu: FakeAmneziawg3EndpointActualState.mtu,
    serverObfuscation: FakeAmneziawg3EndpointActualState.obfuscation,
    clientObfuscation: {
      jc: FakeAmneziawg3EndpointActualState.obfuscation.jc,
      jmin: FakeAmneziawg3EndpointActualState.obfuscation.jmin,
      jmax: FakeAmneziawg3EndpointActualState.obfuscation.jmax,
      i1: FakeAmneziawg3EndpointActualState.obfuscation.i1,
    },
  } satisfies Amneziawg3ConfigData,
  clientConfiguration: "fake-client-configuration",
  clientConfigurationLink: "vpn://fake-client-configuration-link",
}

function createFakeAmneziawg3Client() {
  const client = createAmneziawg3Client()

  return {
    client,
    allocateClientIdentifier: vi.spyOn(client, "allocateClientIdentifier"),
    createInitialConfigData: vi.spyOn(client, "createInitialConfigData"),
    createAccess: vi
      .spyOn(client, "createAccess")
      .mockImplementation(async (_endpointActualState, clientIdentifier, protocolOptions) => ({
        configData: {
          ...FakeAmneziawg3CreateAccessResult.configData,
          ...client.createInitialConfigData(clientIdentifier, protocolOptions),
        },
        clientConfiguration: FakeAmneziawg3CreateAccessResult.clientConfiguration,
        clientConfigurationLink: FakeAmneziawg3CreateAccessResult.clientConfigurationLink,
      })),
    deleteAccessByClientIdentifier: vi
      .spyOn(client, "deleteAccessByClientIdentifier")
      .mockResolvedValue(undefined),
    deleteAccesses: vi.spyOn(client, "deleteAccesses").mockResolvedValue(undefined),
  }
}

export {
  createFakeAmneziawg3Client,
  FakeAmneziawg3CreateAccessResult,
  FakeAmneziawg3EndpointActualState,
  FakeAmneziawg3FirstClientIp,
  FAKE_SERVER_SSH_HOST_KEY,
}
