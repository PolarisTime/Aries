<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  confirmText?: string
  confirmDanger?: boolean
  loading?: boolean
}>(), {
  confirmText: '确认',
  confirmDanger: false,
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [totpCode: string]
}>()

const totpCode = ref('')
const isSubmitDisabled = computed(() => props.loading || !/^\d{6}$/.test(totpCode.value.trim()))

watch(() => props.open, (open) => {
  if (open) {
    totpCode.value = ''
  }
})

function closeModal() {
  if (props.loading) {
    return
  }
  emit('update:open', false)
}

function handleSubmit() {
  if (isSubmitDisabled.value) {
    return
  }
  emit('submit', totpCode.value.trim())
}
</script>

<template>
  <a-modal
    :open="open"
    :title="title"
    :confirm-loading="loading"
    :ok-text="confirmText"
    cancel-text="取消"
    :ok-button-props="{ danger: confirmDanger, disabled: isSubmitDisabled }"
    @update:open="(value: boolean) => emit('update:open', value)"
    @cancel="closeModal"
    @ok="handleSubmit"
  >
    <a-space direction="vertical" style="width: 100%" :size="16">
      <a-alert type="warning" show-icon :message="description" />
      <a-form layout="vertical">
        <a-form-item label="2FA 验证码" required>
          <a-input
            v-model:value="totpCode"
            placeholder="请输入 6 位验证码"
            inputmode="numeric"
            :maxlength="6"
            autocomplete="one-time-code"
            @press-enter="handleSubmit"
          />
        </a-form-item>
      </a-form>
    </a-space>
  </a-modal>
</template>
