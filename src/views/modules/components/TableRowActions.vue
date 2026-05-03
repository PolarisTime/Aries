<script setup lang="ts">
import { PaperClipOutlined } from '@ant-design/icons-vue'
import type { ModuleRecord } from '@/types/module-page'

defineProps<{
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
</script>

<template>
  <div class="table-action-group">
    <span v-if="canView" class="table-action-link" @click="emit('view', record)">查看</span>
    <template v-if="!isReadOnly && canEdit">
      <a-divider v-if="canView" type="vertical" />
      <span class="table-action-link" @click="emit('edit', record)">编辑</span>
    </template>
    <template v-if="!isReadOnly && canAudit">
      <a-divider v-if="canView || canEdit" type="vertical" />
      <a-popconfirm title="确定审核吗?" @confirm="emit('audit', record)">
        <span class="table-action-link">审核</span>
      </a-popconfirm>
    </template>
    <template v-if="!isReadOnly && canReverseAudit">
      <a-divider v-if="canView || canEdit" type="vertical" />
      <a-popconfirm title="确定反审核吗?" @confirm="emit('reverse-audit', record)">
        <span class="table-action-link">反审核</span>
      </a-popconfirm>
    </template>
    <template v-if="!isReadOnly && canDelete">
      <a-divider v-if="canView || canEdit || canAudit || canReverseAudit" type="vertical" />
      <a-popconfirm title="确定删除吗?" @confirm="emit('delete', record)">
        <span class="table-action-link">删除</span>
      </a-popconfirm>
    </template>
    <template v-if="!isReadOnly && canAttach">
      <a-divider v-if="canView || canEdit || canAudit || canReverseAudit || canDelete" type="vertical" />
      <span class="table-action-link" @click="emit('attachment', record)">
        <PaperClipOutlined />
        <span>附件</span>
      </span>
    </template>
    <span v-if="!canView && !(!isReadOnly && canEdit) && !(!isReadOnly && canAudit) && !(!isReadOnly && canReverseAudit) && !(!isReadOnly && canDelete) && !(!isReadOnly && canAttach)">
      --
    </span>
  </div>
</template>
