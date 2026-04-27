<script setup lang="ts">
defineProps<{
  canSave: boolean
  canAudit: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: [audit: boolean]
}>()
</script>

<template>
  <a-button class="overlay-action-button" @click="emit('cancel')">取消</a-button>
  <a-button
    v-if="canSave"
    type="primary"
    class="overlay-action-button"
    :loading="saving"
    @click="emit('save', false)"
  >
    保存
  </a-button>
  <a-button
    v-if="canAudit"
    type="primary"
    class="overlay-action-button"
    :loading="saving"
    @click="emit('save', true)"
  >
    保存并审核
  </a-button>
</template>
