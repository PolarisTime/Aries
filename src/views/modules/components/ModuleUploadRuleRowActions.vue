<script setup lang="ts">
import { computed } from 'vue'
import { EditOutlined, EyeOutlined } from '@ant-design/icons-vue'
import type { ModuleRecord } from '@/types/module-page'
import TableActions from '@/components/TableActions.vue'
import type { ActionItem } from '@/components/TableActions.vue'

const props = defineProps<{
  record: ModuleRecord
  canView: boolean
  canEdit: boolean
  expanded: boolean
  active: boolean
}>()

const emit = defineEmits<{
  toggle: [record: ModuleRecord]
}>()

const actions = computed<ActionItem[]>(() => {
  if (!props.canView) return []

  const isExpanded = props.expanded && props.active
  return [{
    key: 'toggle',
    label: isExpanded ? '收起' : props.canEdit ? '编辑' : '查看',
    icon: isExpanded ? EyeOutlined : props.canEdit ? EditOutlined : EyeOutlined,
    onClick: () => emit('toggle', props.record)
  }]
})
</script>

<template>
  <TableActions :items="actions" />
</template>
