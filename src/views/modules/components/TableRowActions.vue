<script setup lang="ts">
import { computed } from 'vue'
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PaperClipOutlined
} from '@ant-design/icons-vue'
import type { ModuleRecord } from '@/types/module-page'
import TableActions from '@/components/TableActions.vue'
import type { ActionItem } from '@/components/TableActions.vue'

const props = defineProps<{
  record: ModuleRecord
  canView: boolean
  canEdit: boolean
  canAudit: boolean
  canReverseAudit: boolean
  canDelete: boolean
  canAttach: boolean
  isReadOnly: boolean
}>()

const emit = defineEmits<{
  view: [record: ModuleRecord]
  edit: [record: ModuleRecord]
  audit: [record: ModuleRecord]
  'reverse-audit': [record: ModuleRecord]
  delete: [record: ModuleRecord]
  attachment: [record: ModuleRecord]
}>()

const isAudited = computed(() =>
  props.record.status === '已审核' || props.record.status === '已核准'
)

const actions = computed<ActionItem[]>(() => [
  {
    key: 'view',
    label: '查看',
    icon: EyeOutlined,
    visible: props.canView,
    onClick: () => emit('view', props.record)
  },
  {
    key: 'edit',
    label: '编辑',
    icon: EditOutlined,
    visible: !props.isReadOnly && props.canEdit && !isAudited.value,
    onClick: () => emit('edit', props.record)
  },
  {
    key: 'attachment',
    label: '附件',
    icon: PaperClipOutlined,
    visible: !props.isReadOnly && props.canAttach,
    onClick: () => emit('attachment', props.record)
  },
  {
    key: 'delete',
    label: '删除',
    icon: DeleteOutlined,
    danger: true,
    confirm: '确定删除吗?',
    visible: !props.isReadOnly && props.canDelete && !isAudited.value,
    onClick: () => emit('delete', props.record)
  }
])
</script>

<template>
  <TableActions :items="actions" />
</template>
