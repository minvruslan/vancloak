import {
  Amneziawg3ObfuscationPresets,
  ProtocolCodeSchema,
  type ConfigProtocolOptions,
  type DeviceType,
  type ProtocolCode,
} from "@vancloak/api-contract"
import { computed, ref, watch } from "vue"
import {
  RecommendedObfuscationLevel,
  createConfig,
  getConfigs,
  type CreatedConfig,
} from "@/modules/entities/config"
import { useDeviceTypeName, useDeviceTypes } from "@/modules/entities/device-type"
import { useEndpoints } from "@/modules/entities/endpoint"
import { WizardAppsByDeviceTypeCode } from "../constants/WizardAppsByDeviceTypeCode"
import { clearCreateConfigWizardStorage } from "../utils/clearCreateConfigWizardStorage"
import { clearWizardDraft } from "../utils/clearWizardDraft"
import { clearWizardResult } from "../utils/clearWizardResult"
import { readWizardDraft } from "../utils/readWizardDraft"
import { readWizardResult } from "../utils/readWizardResult"
import { writeWizardDraft } from "../utils/writeWizardDraft"
import { writeWizardResult } from "../utils/writeWizardResult"
import { WizardStepOrder } from "../types/WizardStepOrder"
import type { WizardStep } from "../types/WizardStep"
import type { WizardAppId } from "../types/WizardAppId"

function createProtocolOptions(protocolCode: ProtocolCode): ConfigProtocolOptions | undefined {
  if (protocolCode !== ProtocolCodeSchema.enum.amneziawg3) return undefined
  return { protocolCode, ...Amneziawg3ObfuscationPresets[RecommendedObfuscationLevel] }
}

export function useCreateConfigWizard() {
  const { deviceTypes, ready: deviceTypesReady } = useDeviceTypes()
  const { endpoints, ready: endpointsReady } = useEndpoints()
  const deviceTypeName = useDeviceTypeName()
  const { user } = useAuthSession()

  const step = ref<WizardStep>("device")
  const deviceTypeId = ref<string | null>(null)
  const appId = ref<WizardAppId | null>(null)
  const endpointId = ref<string | null>(null)
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

  const stepGuards = computed<Record<WizardStep, boolean>>(() => ({
    device: selectedDeviceType.value !== null,
    app: selectedApp.value !== null,
    endpoint: selectedEndpoint.value !== null,
    done: false,
  }))

  const canContinue = computed(() => stepGuards.value[step.value])

  watch(
    deviceTypeId,
    () => {
      appId.value = null
    },
    { flush: "sync" },
  )

  watch(
    [endpoints, endpointId],
    () => {
      if (endpointId.value !== null) return
      const recommendedEndpoint = endpoints.value.find((endpoint) => endpoint.isRecommended)
      if (recommendedEndpoint) endpointId.value = recommendedEndpoint.id
    },
    { immediate: true },
  )

  watch([step, deviceTypeId, appId, endpointId], () => {
    if (step.value === "done" || !user.value) return
    writeWizardDraft({
      userId: user.value.id,
      step: step.value,
      deviceTypeId: deviceTypeId.value,
      appId: appId.value,
      endpointId: endpointId.value,
    })
  })

  const restoreDraft = () => {
    if (!user.value) return

    const savedResult = readWizardResult(user.value.id)
    if (savedResult) {
      const resultDeviceType = deviceTypes.value.find(
        (deviceType) => deviceType.id === savedResult.deviceTypeId,
      )
      const resultApp = resultDeviceType
        ? WizardAppsByDeviceTypeCode[resultDeviceType.code].find(
            (app) => app.id === savedResult.appId,
          )
        : undefined
      if (resultDeviceType && resultApp) {
        deviceTypeId.value = savedResult.deviceTypeId
        appId.value = savedResult.appId
        created.value = savedResult.created
        step.value = "done"
        return
      }
      clearWizardResult()
    }

    const savedDraft = readWizardDraft(user.value.id)

    if (!savedDraft || savedDraft.step === "done") {
      clearWizardDraft()
      return
    }

    deviceTypeId.value = savedDraft.deviceTypeId
    appId.value = savedDraft.appId
    endpointId.value = savedDraft.endpointId

    const previousSteps = WizardStepOrder.slice(0, WizardStepOrder.indexOf(savedDraft.step))
    if (previousSteps.every((previousStep) => stepGuards.value[previousStep])) {
      step.value = savedDraft.step
      return
    }

    deviceTypeId.value = null
    appId.value = null
    endpointId.value = null
    clearWizardDraft()
  }

  const clearStorage = () => clearCreateConfigWizardStorage()

  const back = () => {
    if (pending.value) return
    if (step.value === "device" || step.value === "done") return
    const previousStep = WizardStepOrder[WizardStepOrder.indexOf(step.value) - 1]
    if (previousStep) step.value = previousStep
  }

  const next = () => {
    if (step.value === "endpoint" || step.value === "done") return
    if (!canContinue.value) return
    const nextStep = WizardStepOrder[WizardStepOrder.indexOf(step.value) + 1]
    if (nextStep) step.value = nextStep
  }

  const createConfigName = async (deviceTypeCode: DeviceType["code"]) => {
    const baseName = deviceTypeName(deviceTypeCode)
    const existingConfigs = await getConfigs().catch(() => [])
    const takenNames = new Set(existingConfigs.map((config) => config.name.trim()))
    if (!takenNames.has(baseName)) return baseName
    let nameNumber = 2
    while (takenNames.has(`${baseName} ${nameNumber}`)) nameNumber += 1
    return `${baseName} ${nameNumber}`
  }

  const submit = async () => {
    if (step.value !== "endpoint" || pending.value) return false
    if (!selectedEndpoint.value || !selectedDeviceType.value || !selectedApp.value) return false

    pending.value = true
    clearWizardDraft()
    try {
      created.value = await createConfig({
        name: await createConfigName(selectedDeviceType.value.code),
        endpointId: selectedEndpoint.value.id,
        deviceTypeId: selectedDeviceType.value.id,
        protocolOptions: createProtocolOptions(selectedEndpoint.value.protocol.code),
      })
      step.value = "done"
      if (user.value) {
        writeWizardResult({
          userId: user.value.id,
          deviceTypeId: selectedDeviceType.value.id,
          appId: selectedApp.value.id,
          created: created.value,
        })
      }
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
    deviceTypeId,
    appId,
    endpointId,
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
    submit,
    restoreDraft,
    clearStorage,
    ready,
  }
}
