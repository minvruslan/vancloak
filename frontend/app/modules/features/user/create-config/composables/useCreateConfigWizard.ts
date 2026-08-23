import {
  Amneziawg2ObfuscationPresets,
  ProtocolCodeSchema,
  UpsertConfigSchema,
  type Amneziawg2ObfuscationLevel,
  type ConfigProtocolOptions,
  type ProtocolCode,
} from "@vancloak/api-contract"
import { computed, ref, watch } from "vue"
import {
  RecommendedObfuscationLevel,
  createConfig,
  type CreatedConfig,
} from "@/modules/entities/config"
import { useDeviceTypes } from "@/modules/entities/device-type"
import { useEndpoints } from "@/modules/entities/endpoint"
import { WizardAppsByDeviceTypeCode } from "../constants/WizardAppsByDeviceTypeCode"
import { WizardStepOrder } from "../types/WizardStepOrder"
import type { WizardStep } from "../types/WizardStep"
import type { WizardAppId } from "../types/WizardAppId"

function createProtocolOptions(
  protocolCode: ProtocolCode,
  obfuscationLevel: Amneziawg2ObfuscationLevel,
): ConfigProtocolOptions | undefined {
  if (protocolCode !== ProtocolCodeSchema.enum.amneziawg2) return undefined
  return { protocolCode, ...Amneziawg2ObfuscationPresets[obfuscationLevel] }
}

export function useCreateConfigWizard() {
  const { deviceTypes, ready: deviceTypesReady } = useDeviceTypes()
  const { endpoints, ready: endpointsReady } = useEndpoints()

  const step = ref<WizardStep>("name")
  const name = ref("")
  const deviceTypeId = ref<string | null>(null)
  const appId = ref<WizardAppId | null>(null)
  const endpointId = ref<string | null>(null)
  const obfuscationLevel = ref<Amneziawg2ObfuscationLevel>(RecommendedObfuscationLevel)
  const created = ref<CreatedConfig | null>(null)
  const pending = ref(false)

  const stepNumber = computed(() => WizardStepOrder.indexOf(step.value) + 1)
  const stepCount = WizardStepOrder.length

  const selectedDeviceType = computed(
    () => deviceTypes.value.find((deviceType) => deviceType.id === deviceTypeId.value) ?? null,
  )
  const selectedApp = computed(() => {
    if (!selectedDeviceType.value || !appId.value) return null
    const deviceApps = WizardAppsByDeviceTypeCode[selectedDeviceType.value.code]
    return deviceApps.find((app) => app.id === appId.value) ?? null
  })
  const selectedEndpoint = computed(
    () => endpoints.value.find((endpoint) => endpoint.id === endpointId.value) ?? null,
  )

  const canContinue = computed(() => {
    const guards: Record<WizardStep, boolean> = {
      name: UpsertConfigSchema.shape.name.safeParse(name.value.trim()).success,
      device: selectedDeviceType.value !== null,
      app: selectedApp.value !== null,
      endpoint: selectedEndpoint.value !== null,
      profile: true,
      acknowledge: true,
      done: false,
    }
    return guards[step.value]
  })

  watch(deviceTypeId, () => {
    appId.value = null
  })

  const back = () => {
    if (pending.value) return
    if (step.value === "name" || step.value === "done") return
    const previousStep = WizardStepOrder[WizardStepOrder.indexOf(step.value) - 1]
    if (previousStep) step.value = previousStep
  }

  const next = () => {
    if (step.value === "acknowledge" || step.value === "done") return
    if (!canContinue.value) return
    const nextStep = WizardStepOrder[WizardStepOrder.indexOf(step.value) + 1]
    if (nextStep) step.value = nextStep
  }

  const chooseApp = (id: WizardAppId) => {
    if (step.value !== "app") return
    appId.value = id
    next()
  }

  const submit = async () => {
    if (step.value !== "acknowledge" || pending.value) return false
    if (!selectedEndpoint.value || !selectedDeviceType.value) return false

    pending.value = true
    try {
      created.value = await createConfig({
        name: name.value.trim(),
        endpointId: selectedEndpoint.value.id,
        deviceTypeId: selectedDeviceType.value.id,
        protocolOptions: createProtocolOptions(
          selectedEndpoint.value.protocol.code,
          obfuscationLevel.value,
        ),
      })
      step.value = "done"
      return true
    } catch {
      return false
    } finally {
      pending.value = false
    }
  }

  const ready = Promise.all([deviceTypesReady, endpointsReady])

  return {
    step,
    stepNumber,
    stepCount,
    name,
    deviceTypeId,
    endpointId,
    obfuscationLevel,
    created,
    pending,
    deviceTypes,
    endpoints,
    selectedDeviceType,
    selectedApp,
    selectedEndpoint,
    canContinue,
    back,
    next,
    chooseApp,
    submit,
    ready,
  }
}
