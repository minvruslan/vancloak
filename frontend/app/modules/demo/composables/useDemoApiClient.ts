import { ORPCError } from "@orpc/client"
import {
  Amneziawg3ObfuscationPresets,
  ProtocolCodeSchema,
  ProtocolFamilyCodeSchema,
  type Amneziawg3ObfuscationOptions,
  type Config,
  type UpsertConfig,
} from "@vancloak/api-contract"
import { DemoClientIp } from "../constants/DemoClientIp"
import { DemoDeviceTypes } from "../constants/DemoDeviceTypes"
import { DemoEndpoints } from "../constants/DemoEndpoints"
import { createDemoClientConfiguration } from "../utils/createDemoClientConfiguration"
import { useDemoConfigsState } from "./useDemoConfigsState"
import type { DemoApiClient } from "../types/DemoApiClient"

const CONFIG_LIMIT_MAX_COUNT = 5
const MUTATION_DELAY_MILLISECONDS = 2000
const READ_DELAY_MINIMUM_MILLISECONDS = 150
const READ_DELAY_SPREAD_MILLISECONDS = 150
const CONFIG_LIMIT_ID = "e0952d2a-93bd-4b5d-a355-1bf5bc9cb712"

function waitForDemoMutation(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MUTATION_DELAY_MILLISECONDS))
}

function waitForDemoRead(): Promise<void> {
  const delayMilliseconds =
    READ_DELAY_MINIMUM_MILLISECONDS + Math.random() * READ_DELAY_SPREAD_MILLISECONDS
  return new Promise((resolve) => setTimeout(resolve, delayMilliseconds))
}

function createDemoConfigOptions(
  protocolOptions: UpsertConfig["protocolOptions"],
): Amneziawg3ObfuscationOptions {
  const defaultOptions = Amneziawg3ObfuscationPresets.medium
  if (!protocolOptions || protocolOptions.protocolCode !== ProtocolCodeSchema.enum.amneziawg3) {
    return defaultOptions
  }
  return {
    protocolProfile: protocolOptions.protocolProfile ?? defaultOptions.protocolProfile,
    browserFingerprint:
      protocolOptions.browserFingerprint !== undefined
        ? protocolOptions.browserFingerprint
        : defaultOptions.browserFingerprint,
    junkPacketCount: protocolOptions.junkPacketCount ?? defaultOptions.junkPacketCount,
    junkPacketSize: protocolOptions.junkPacketSize ?? defaultOptions.junkPacketSize,
    noisePackets:
      protocolOptions.noisePackets !== undefined
        ? protocolOptions.noisePackets
        : defaultOptions.noisePackets,
  }
}

function createDemoClientConfigurationLink(clientConfiguration: string): string {
  return `vpn://${btoa(clientConfiguration).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`
}

export function useDemoApiClient(): DemoApiClient {
  const configs = useDemoConfigsState()

  function findConfig(id: string): Config {
    const config = configs.value.find((entry) => entry.id === id)
    if (!config) throw new ORPCError("NOT_FOUND", { status: 404, message: "Config not found" })
    return config
  }

  return {
    configs: {
      getUserConfigs: async () => configs.value,
      getUserConfig: async ({ id }) => findConfig(id),
      createUserConfig: async (payload) => {
        await waitForDemoMutation()
        if (configs.value.length >= CONFIG_LIMIT_MAX_COUNT) {
          throw new ORPCError("LIMIT_REACHED", {
            status: 409,
            message: "Config limit reached for this protocol family",
          })
        }
        const endpoint = DemoEndpoints.find((entry) => entry.id === payload.endpointId)
        if (!endpoint) {
          throw new ORPCError("ENDPOINT_INVALID", { status: 400, message: "Invalid endpoint" })
        }
        const deviceType = DemoDeviceTypes.find((entry) => entry.id === payload.deviceTypeId)
        if (!deviceType) {
          throw new ORPCError("DEVICE_TYPE_INVALID", {
            status: 400,
            message: "Invalid device type",
          })
        }
        const createdAt = new Date().toISOString()
        const config: Config = {
          id: crypto.randomUUID(),
          name: payload.name,
          deviceType,
          endpoint,
          data: {
            protocolCode: ProtocolCodeSchema.enum.amneziawg3,
            clientIp: DemoClientIp,
            options: createDemoConfigOptions(payload.protocolOptions),
          },
          status: "active",
          createdAt,
          updatedAt: createdAt,
        }
        configs.value = [config, ...configs.value]
        const clientConfiguration = createDemoClientConfiguration(config)
        return {
          ...config,
          clientConfiguration,
          clientConfigurationLink: createDemoClientConfigurationLink(clientConfiguration),
        }
      },
      updateUserConfig: async ({ id, name, deviceTypeId }) => {
        await waitForDemoRead()
        const config = findConfig(id)
        const deviceType = DemoDeviceTypes.find((entry) => entry.id === deviceTypeId)
        if (!deviceType) {
          throw new ORPCError("DEVICE_TYPE_INVALID", {
            status: 400,
            message: "Invalid device type",
          })
        }
        const updatedConfig: Config = {
          ...config,
          name,
          deviceType,
          updatedAt: new Date().toISOString(),
        }
        configs.value = configs.value.map((entry) => (entry.id === id ? updatedConfig : entry))
        return updatedConfig
      },
      deleteUserConfig: async ({ id }) => {
        await waitForDemoMutation()
        const config = findConfig(id)
        configs.value = configs.value.filter((entry) => entry.id !== config.id)
        return { id: config.id }
      },
    },
    configLimits: {
      getUserConfigLimits: async () => {
        const timestamp = new Date().toISOString()
        return [
          {
            id: CONFIG_LIMIT_ID,
            protocolFamily: ProtocolFamilyCodeSchema.enum.amneziawg,
            maxCount: CONFIG_LIMIT_MAX_COUNT,
            used: configs.value.length,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ]
      },
    },
    deviceTypes: {
      getDeviceTypes: async () => DemoDeviceTypes,
    },
    endpoints: {
      getEndpoints: async () => DemoEndpoints,
    },
  }
}
