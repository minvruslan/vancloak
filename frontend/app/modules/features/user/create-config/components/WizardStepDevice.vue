<script setup lang="ts">
import { DeviceTypeSchema, type DeviceType } from "@vancloak/api-contract"
import { ChevronRight } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { DeviceTypeLogo, DeviceTypeName } from "@/modules/entities/device-type"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import WizardSelectableTile from "./WizardSelectableTile.vue"
import WizardStepHeader from "./WizardStepHeader.vue"
import WizardStepLayout from "./WizardStepLayout.vue"
import { messages } from "../translations/WizardStepDevice"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const { t } = useI18n({ useScope: "local", messages })
const { deviceTypes, deviceTypeId, stepNumber, stepCount, canContinue, next, back } = props.wizard

const EnabledDeviceTypeCodes: DeviceType["code"][] = [
  DeviceTypeSchema.shape.code.enum.ios,
  DeviceTypeSchema.shape.code.enum.ipados,
  DeviceTypeSchema.shape.code.enum.macos,
  DeviceTypeSchema.shape.code.enum.windows,
  DeviceTypeSchema.shape.code.enum.android,
]
</script>

<template>
  <WizardStepLayout>
    <template #header>
      <WizardStepHeader
        :step-number="stepNumber"
        :step-count="stepCount"
        :title="t('title')"
        @back="back"
      />
    </template>

    <p class="mb-4 text-sm leading-relaxed text-muted-foreground sm:mb-4.5">
      {{ t("description") }}
    </p>

    <div class="grid gap-3 sm:grid-cols-2">
      <WizardSelectableTile
        v-for="deviceType in deviceTypes"
        :key="deviceType.id"
        :selected="deviceTypeId === deviceType.id"
        :disabled="!EnabledDeviceTypeCodes.includes(deviceType.code)"
        @select="deviceTypeId = deviceType.id"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <DeviceTypeLogo :code="deviceType.code" class="size-4.5 text-foreground" />
        </div>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">
          <DeviceTypeName :code="deviceType.code" />
        </span>
      </WizardSelectableTile>
    </div>

    <p v-if="!deviceTypes.length" class="text-sm text-muted-foreground">{{ t("empty") }}</p>

    <template #footer>
      <Button type="button" class="w-full" :disabled="!canContinue" @click="next">
        {{ t("continueAction") }}
        <ChevronRight class="size-4" aria-hidden="true" />
      </Button>
    </template>
  </WizardStepLayout>
</template>
