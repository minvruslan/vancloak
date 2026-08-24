<script setup lang="ts">
import type { Config, UpdateConfig } from "@vancloak/api-contract"
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue"
import { Save, Trash2 } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldLabel } from "@/modules/shared/components"
import {
  ConfigObfuscationDetails,
  ConfigObfuscationLevelPill,
  getConfigObfuscationLevel,
  useConfig,
  useUpdateConfig,
  useDeleteConfig,
} from "@/modules/entities/config"
import { useDeviceTypes, DeviceTypeName } from "@/modules/entities/device-type"
import { EndpointDetails } from "@/modules/entities/endpoint"
import { messages } from "../translations/UpdateConfigForm"

const props = defineProps<{ id: string }>()
const emit = defineEmits<{
  (e: "updated", config: Config): void
  (e: "deleted" | "cancel"): void
}>()

const { t } = useI18n({ useScope: "local", messages })
const { config, status, ready } = useConfig(props.id)
const { deviceTypes, ready: deviceTypesReady } = useDeviceTypes()
const { pending, update } = useUpdateConfig(props.id)
const { pending: deleting, deleteConfig } = useDeleteConfig(props.id)
const { confirm } = useConfirmationDialog()
const { showSuccess, showError } = useNotificationBanner()
const { locked: navigationLocked } = useNavigationLock()

const nameInput = ref<{ $el: HTMLInputElement } | null>(null)
const { scrollElement, canScrollDown } = useScrollOverflow()

onMounted(() => {
  if (window.matchMedia("(min-width: 40rem)").matches) nameInput.value?.$el?.focus()
})

watchEffect(() => {
  navigationLocked.value = pending.value || deleting.value
})

onUnmounted(() => {
  navigationLocked.value = false
})

await Promise.all([ready, deviceTypesReady])

const loadedConfig = config.value

const obfuscationLevel = computed(() =>
  config.value ? getConfigObfuscationLevel(config.value.data) : null,
)

const form = ref<UpdateConfig>({
  name: loadedConfig?.name ?? "",
  deviceTypeId: loadedConfig?.deviceType.id ?? "",
})

const onEnter = (event: KeyboardEvent) => {
  if (event.target instanceof HTMLInputElement) event.preventDefault()
}

const onSubmit = async () => {
  if (pending.value) return
  const updated = await update({ ...form.value })
  if (updated) {
    showSuccess(t("notifications.updated"))
    emit("updated", updated)
  } else {
    showError(t("notifications.updateError"))
  }
}

const onDelete = async () => {
  const confirmed = await confirm({
    title: t("deleteConfirmationDialog.title"),
    description: t("deleteConfirmationDialog.description", { name: form.value.name }),
    confirmButtonText: t("actions.delete"),
    destructive: true,
  })

  if (!confirmed) return

  if (await deleteConfig()) {
    showSuccess(t("notifications.deleted"))
    emit("deleted")
  } else {
    showError(t("notifications.deleteError"))
  }
}
</script>

<template>
  <form
    v-if="config"
    class="flex min-h-0 flex-1 flex-col"
    novalidate
    @submit.prevent="onSubmit"
    @keydown.enter="onEnter"
  >
    <fieldset :disabled="pending || deleting" class="min-h-0 min-w-0 flex-1">
      <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
        <div class="flex items-center justify-between gap-3 px-7 pt-7 max-sm:px-4.5 max-sm:pt-4.5">
          <h1 class="text-lg font-semibold tracking-tight">{{ t("title") }}</h1>
          <ConfigObfuscationLevelPill
            v-if="obfuscationLevel"
            :level="obfuscationLevel"
            class="mt-0.5"
          />
        </div>

        <div class="relative mt-4 flex min-h-0 flex-1 flex-col sm:mt-4.5">
          <div
            ref="scrollElement"
            class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-7 pb-4 max-sm:px-4.5 sm:gap-5 sm:pb-4.5"
          >
            <div class="flex flex-col gap-2">
              <FieldLabel for="name" required>{{ t("fields.name.label") }}</FieldLabel>
              <Input
                id="name"
                ref="nameInput"
                v-model="form.name"
                aria-required="true"
                :placeholder="t('fields.name.placeholder')"
              />
            </div>

            <div class="flex flex-col gap-2">
              <FieldLabel for="deviceType" required>{{ t("fields.deviceType.label") }}</FieldLabel>
              <Select v-model="form.deviceTypeId" :disabled="pending || deleting">
                <SelectTrigger
                  id="deviceType"
                  class="w-full"
                  aria-required="true"
                  :disabled="!deviceTypes.length"
                >
                  <SelectValue :placeholder="t('fields.deviceType.placeholder')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="deviceType in deviceTypes"
                    :key="deviceType.id"
                    :value="deviceType.id"
                  >
                    <DeviceTypeName :code="deviceType.code" />
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <EndpointDetails :endpoint="config.endpoint" />

            <ConfigObfuscationDetails :data="config.data" />
          </div>
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-card to-transparent transition-opacity duration-300"
            :class="canScrollDown ? 'opacity-100' : 'opacity-0'"
          />
        </div>

        <div
          class="flex flex-wrap-reverse gap-3 px-7 pb-7 max-sm:px-4.5 max-sm:pb-4.5 sm:flex-nowrap sm:items-center sm:justify-end"
        >
          <Button
            type="button"
            variant="outline"
            class="w-full max-sm:basis-full sm:w-28"
            :disabled="pending || deleting"
            @click="emit('cancel')"
          >
            {{ t("actions.cancel") }}
          </Button>
          <Button
            type="button"
            variant="destructive"
            class="max-sm:min-w-36 max-sm:grow max-sm:basis-36 sm:order-first sm:mr-auto sm:w-32"
            :loading="deleting"
            :disabled="pending"
            @click="onDelete"
          >
            <Trash2 class="size-4" aria-hidden="true" />
            {{ t("actions.delete") }}
          </Button>
          <Button
            type="submit"
            class="max-sm:min-w-36 max-sm:grow max-sm:basis-36 sm:w-32"
            :loading="pending"
            :disabled="deleting"
          >
            <Save class="size-4" aria-hidden="true" />
            {{ t("actions.update") }}
          </Button>
        </div>
      </div>
    </fieldset>
  </form>

  <div
    v-else-if="status !== 'pending'"
    class="flex flex-col items-start gap-4 rounded-2xl border bg-card p-7 max-sm:p-4.5"
  >
    <p role="alert" class="text-sm text-muted-foreground">
      {{ t("notifications.notFoundError") }}
    </p>
    <Button variant="outline" class="w-full sm:w-28" @click="emit('cancel')">
      {{ t("actions.back") }}
    </Button>
  </div>
</template>
