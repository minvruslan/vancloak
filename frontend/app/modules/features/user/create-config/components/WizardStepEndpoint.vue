<script setup lang="ts">
import { ChevronRight } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { useCountries } from "@/modules/shared/composables"
import type { CreateConfigWizardMachine } from "../types/CreateConfigWizardMachine"
import WizardSelectableTile from "./WizardSelectableTile.vue"
import WizardStepHeader from "./WizardStepHeader.vue"
import WizardStepLayout from "./WizardStepLayout.vue"
import { messages } from "../translations/WizardStepEndpoint"

const props = defineProps<{ wizard: CreateConfigWizardMachine }>()

const { t } = useI18n({ useScope: "local", messages })
const { getCountryName } = useCountries()
const { endpoints, endpointId, stepNumber, stepCount, canContinue, next, back } = props.wizard
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

    <div class="flex flex-col gap-2.5">
      <template v-for="endpoint in endpoints" :key="endpoint.id">
        <div class="relative">
          <WizardSelectableTile
            :selected="endpointId === endpoint.id"
            @select="endpointId = endpoint.id"
          >
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="truncate text-sm font-semibold">{{ endpoint.server.name }}</span>
              <span class="truncate text-xs text-muted-foreground">
                {{ getCountryName(endpoint.server.country) }}
              </span>
            </div>
          </WizardSelectableTile>
          <span
            v-if="endpoint.isRecommended && endpoints.length > 1"
            class="pointer-events-none absolute -top-2.5 right-2.5 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground ring-2 ring-background"
          >
            {{ t("recommended") }}
          </span>
        </div>
      </template>
    </div>

    <p v-if="!endpoints.length" class="text-sm text-muted-foreground">{{ t("empty") }}</p>

    <template #footer>
      <Button type="button" class="w-full" :disabled="!canContinue" @click="next">
        {{ t("continueAction") }}
        <ChevronRight class="size-4" aria-hidden="true" />
      </Button>
    </template>
  </WizardStepLayout>
</template>
