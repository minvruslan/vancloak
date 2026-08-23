import { RemoteServer, type ProtocolClient } from "@vancloak/infrastructure"
import {
  Amneziawg2EndpointActualStateSchema,
  Amneziawg2ObfuscationDefaults,
  Amneziawg2ObfuscationOptionsSchema,
  ProtocolCodeSchema,
  type Amneziawg2ConfigData,
} from "@vancloak/infrastructure/shared"
import { vi } from "vitest"

const FAKE_SERVER_SSH_HOST_KEY = "ssh-ed25519 AAAATestServerHostKey"

function createAmneziawg2Client(): ProtocolClient {
  return new RemoteServer({
    ip: "192.0.2.1",
    port: 22,
    username: "vancloak",
    privateKey: "fake-ssh-private-key",
    sshHostKeys: [FAKE_SERVER_SSH_HOST_KEY],
  }).getProtocolClient(ProtocolCodeSchema.enum.amneziawg2)
}

const FakeAmneziawg2EndpointActualState = Amneziawg2EndpointActualStateSchema.parse({
  ...createAmneziawg2Client().createEndpointDesiredState(51820, "192.0.2.1", "1.1.1.1"),
  appliedAt: "2026-01-01T00:00:00.000Z",
})

const FakeAmneziawg2CreateAccessResult = {
  configData: {
    protocolCode: ProtocolCodeSchema.enum.amneziawg2,
    clientIp: `${FakeAmneziawg2EndpointActualState.subnetPrefix}.2`,
    publicKey: "fake-public-key",
    presharedKey: "fake-preshared-key",
    serverPublicKey: FakeAmneziawg2EndpointActualState.serverPublicKey,
    host: FakeAmneziawg2EndpointActualState.host,
    port: FakeAmneziawg2EndpointActualState.port,
    dns: FakeAmneziawg2EndpointActualState.dns,
    mtu: FakeAmneziawg2EndpointActualState.mtu,
    serverObfuscation: FakeAmneziawg2EndpointActualState.obfuscation,
    clientObfuscation: {
      jc: FakeAmneziawg2EndpointActualState.obfuscation.jc,
      jmin: FakeAmneziawg2EndpointActualState.obfuscation.jmin,
      jmax: FakeAmneziawg2EndpointActualState.obfuscation.jmax,
      i1: FakeAmneziawg2EndpointActualState.obfuscation.i1,
    },
    options: { ...Amneziawg2ObfuscationDefaults },
  } satisfies Amneziawg2ConfigData,
  clientConfiguration: "fake-client-configuration",
  clientConfigurationLink: "vpn://fake-client-configuration-link",
}

function createFakeAmneziawg2Client() {
  const client = createAmneziawg2Client()

  return {
    client,
    allocateClientIdentifier: vi.spyOn(client, "allocateClientIdentifier"),
    createInitialConfigData: vi.spyOn(client, "createInitialConfigData"),
    createAccess: vi
      .spyOn(client, "createAccess")
      .mockImplementation(async (_endpointActualState, clientIdentifier, protocolOptions) => ({
        configData: {
          ...FakeAmneziawg2CreateAccessResult.configData,
          clientIp: clientIdentifier,
          options: Amneziawg2ObfuscationOptionsSchema.parse(protocolOptions),
        },
        clientConfiguration: FakeAmneziawg2CreateAccessResult.clientConfiguration,
        clientConfigurationLink: FakeAmneziawg2CreateAccessResult.clientConfigurationLink,
      })),
    deleteAccessByClientIdentifier: vi
      .spyOn(client, "deleteAccessByClientIdentifier")
      .mockResolvedValue(undefined),
    deleteAccesses: vi.spyOn(client, "deleteAccesses").mockResolvedValue(undefined),
  }
}

export {
  createFakeAmneziawg2Client,
  FakeAmneziawg2CreateAccessResult,
  FakeAmneziawg2EndpointActualState,
  FAKE_SERVER_SSH_HOST_KEY,
}
