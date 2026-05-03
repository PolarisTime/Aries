<script setup lang="ts">
import type { ModuleRecord } from '@/types/module-page'

defineProps<{
  record: ModuleRecord
  canView: boolean
  canEdit: boolean
  expanded: boolean
  active: boolean
}>()

const emit = defineEmits<{
  toggle: [record: ModuleRecord]
}>()
</script>

<template>
  <div class="table-action-group">
    <span v-if="canView" class="table-action-link" @click="emit('toggle', record)">
      {{ expanded && active ? '收起' : canEdit ? '编辑' : '查看' }}
    </span>
    <span v-else>--</span>
  </div>
</template>
