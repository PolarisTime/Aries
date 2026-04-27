<script setup lang="ts">
import type { ModuleRecord, ModuleStatusMeta } from '@/types/module-page'
import ModuleSelectionOverlay from './ModuleSelectionOverlay.vue'

type TableBinding = Record<string, unknown>
type TableRowHandler = {
  bivarianceHack(record: ModuleRecord): TableBinding
}['bivarianceHack']

defineProps<{
  visible: boolean
  title: string
  rows: ModuleRecord[]
  loading: boolean
  rowSelection: TableBinding
  customRow: TableRowHandler
  keyword: string
  canConfirm: boolean
  getParentRelationNo: (record: ModuleRecord) => string
  getParentOptionLabel: (record: ModuleRecord) => string
  getStatusMeta: (value: unknown) => ModuleStatusMeta
}>()

defineEmits<{
  cancel: []
  confirm: []
  'update:keyword': [value: string]
}>()
</script>

<template>
  <ModuleSelectionOverlay
    :visible="visible"
    :title="title"
    panel-title="上级单据选择"
    :rows="rows"
    :loading="loading"
    :row-selection="rowSelection"
    :custom-row="customRow"
    empty-description="暂无可选上级单据"
    confirm-text="导入明细"
    :confirm-visible="canConfirm"
    @cancel="$emit('cancel')"
    @confirm="$emit('confirm')"
  >
    <template #meta>
      <span class="module-table-head-title">上级单据选择</span>
      <a-input
        :value="keyword"
        allow-clear
        class="parent-selector-search"
        placeholder="输入单号、客户、供应商、项目搜索"
        @update:value="$emit('update:keyword', $event)"
      />
    </template>

    <template #summary>
      <span class="parent-selector-hint">双击行可直接导入</span>
    </template>

    <a-table-column key="parentNo" title="单据编号" width="180">
      <template #default="{ record }">
        {{ getParentRelationNo(record) }}
      </template>
    </a-table-column>
    <a-table-column key="summary" title="摘要">
      <template #default="{ record }">
        {{ getParentOptionLabel(record) }}
      </template>
    </a-table-column>
    <a-table-column key="status" title="状态" width="120" align="center">
      <template #default="{ record }">
        <a-tag :color="getStatusMeta(record.status).color">
          {{ getStatusMeta(record.status).text }}
        </a-tag>
      </template>
    </a-table-column>
  </ModuleSelectionOverlay>
</template>
