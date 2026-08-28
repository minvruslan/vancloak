<script setup lang="ts">
import { onMounted, ref, watch } from "vue"
import { useCreateConfigWizard } from "../composables/useCreateConfigWizard"
import { WizardStepOrder } from "../types/WizardStepOrder"
import WizardStepAcknowledge from "./WizardStepAcknowledge.vue"
import WizardStepApp from "./WizardStepApp.vue"
import WizardStepAppMacos from "./WizardStepAppMacos.vue"
import WizardStepDevice from "./WizardStepDevice.vue"
import WizardStepDone from "./WizardStepDone.vue"
import WizardStepEndpoint from "./WizardStepEndpoint.vue"
import WizardStepName from "./WizardStepName.vue"
import WizardStepProfile from "./WizardStepProfile.vue"
import WizardStepSkeleton from "./WizardStepSkeleton.vue"

const emit = defineEmits<{ (e: "exit" | "done"): void }>()

const wizard = useCreateConfigWizard()
const { step, selectedDeviceType } = wizard

const direction = ref<"forward" | "back">("forward")
const restored = ref(false)

watch(step, (nextStep, previousStep) => {
  direction.value =
    WizardStepOrder.indexOf(nextStep) >= WizardStepOrder.indexOf(previousStep) ? "forward" : "back"
})

onBeforeRouteLeave(() => {
  if (wizard.pending.value) return false
  wizard.clearStorage()
})

await wizard.ready

const restore = () => {
  wizard.restoreDraft()
  restored.value = true
}

if (import.meta.client && !useNuxtApp().isHydrating) restore()
else onMounted(restore)
</script>

<template>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card max-sm:min-h-105"
  >
    <div class="flex min-h-0 flex-1 flex-col">
      <Transition
        mode="out-in"
        enter-active-class="transition-all duration-150 ease-out motion-reduce:transition-none"
        :enter-from-class="
          direction === 'forward' ? 'translate-x-2 opacity-0' : '-translate-x-2 opacity-0'
        "
        leave-active-class="transition-all duration-150 ease-in motion-reduce:transition-none"
        :leave-to-class="
          direction === 'forward' ? '-translate-x-2 opacity-0' : 'translate-x-2 opacity-0'
        "
      >
        <WizardStepSkeleton v-if="!restored" />
        <WizardStepName v-else-if="step === 'name'" :wizard="wizard" @exit="emit('exit')" />
        <WizardStepDevice v-else-if="step === 'device'" :wizard="wizard" />
        <WizardStepAppMacos
          v-else-if="step === 'app' && selectedDeviceType?.code === 'macos'"
          :wizard="wizard"
        />
        <WizardStepApp v-else-if="step === 'app'" :wizard="wizard" />
        <WizardStepEndpoint v-else-if="step === 'endpoint'" :wizard="wizard" />
        <WizardStepProfile v-else-if="step === 'profile'" :wizard="wizard" />
        <WizardStepAcknowledge v-else-if="step === 'acknowledge'" :wizard="wizard" />
        <WizardStepDone v-else :wizard="wizard" @done="emit('done')" />
      </Transition>
    </div>
  </div>
</template>
