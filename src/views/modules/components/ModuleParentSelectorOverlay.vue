<script setup lang="ts">
import { computed, h } from 'vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import type { ModuleRecord, ModuleStatusMeta } from '@/types/module-page'
import ModuleSelectionOverlay from './ModuleSelectionOverlay.vue'

type TableRowHandler = (record: ModuleRecord) => Record<string, unknown>

const props = defineProps<{
  visible: boolean
  title: string
  rows: ModuleRecord[]
  loading: boolean
  rowSelection: {
    selectedRowKeys: (string | number)[]
    onChange: (keys: (string | number)[], rows: ModuleRecord[]) => void
    getCheckboxProps?: (record: ModuleRecord) => { disabled?: boolean }
  }
  customRow: TableRowHandler
  keyword: string
  paginationEnabled: boolean
  currentPage: number
  pageSize: number
  total: number
  canConfirm: boolean
  showParentImportableQuantity?: boolean
  getParentImportableQuantity?: (record: ModuleRecord) => number | undefined
  getParentRelationNo: (record: ModuleRecord) => string
  getParentOptionLabel: (record: ModuleRecord) => string
  getStatusMeta: (value: unknown) => ModuleStatusMeta
}>()

defineEmits<{
  cancel: []
  confirm: []
  'update:keyword': [value: string]
  'update:current-page': [value: number]
  'update:page-size': [value: number]
}>()

const columnHelper = createColumnHelper<ModuleRecord>()

const columns = computed<ColumnDef<ModuleRecord, unknown>[]>(() => {
  const cols: ColumnDef<ModuleRecord, unknown>[] = [
    columnHelper.display({
      id: 'parentNo',
      header: () => '单据编号',
      cell: (info) => props.getParentRelationNo(info.row.original),
      meta: { width: 180 },
    }),
    columnHelper.display({
      id: 'summary',
      header: () => '摘要',
      cell: (info) => props.getParentOptionLabel(info.row.original),
    }),
  ]

  if (props.showParentImportableQuantity) {
    cols.push(
      columnHelper.display({
        id: 'importableQuantity',
        header: () => '可导入数量',
        cell: (info) => props.getParentImportableQuantity?.(info.row.original) ?? '--',
        meta: { width: 110, align: 'center' },
      }),
    )
  }

  cols.push(
    columnHelper.accessor('status', {
      header: () => '状态',
      cell: (info) => {
        const meta = props.getStatusMeta(info.getValue())
        return h('span', { class: `ant-tag ant-tag-${meta.color}` }, meta.text)
      },
      meta: { width: 120, align: 'center' },
    }),
  )

  return cols
})
</script>

<template>
  <ModuleSelectionOverlay
    :visible="visible"
    :title="title"
    panel-title="上级单据选择"
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :row-selection="rowSelection"
    :custom-row="customRow"
    :pagination-state="paginationEnabled ? { current: currentPage, pageSize, total, showSizeChanger: true } : undefined"
    empty-description="暂无可选上级单据"
    confirm-text="导入明细"
    :confirm-visible="canConfirm"
    @cancel="$emit('cancel')"
    @confirm="$emit('confirm')"
    @update:pagination-current="$emit('update:current-page', $event)"
    @update:pagination-page-size="$emit('update:page-size', $event)"
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
  </ModuleSelectionOverlay>
</template>
