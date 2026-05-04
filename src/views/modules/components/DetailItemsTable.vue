<script setup lang="ts">
import { computed, h } from 'vue'
import { type ColumnDef } from '@tanstack/vue-table'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { ModuleColumnDefinition, ModuleLineItem } from '@/types/module-page'
import type { StatusMeta } from '@/composables/use-module-display-support'

type TableColumn = Record<string, unknown>

const props = defineProps<{
  items: ModuleLineItem[]
  columns: TableColumn[]
  itemColumnsMeta?: ModuleColumnDefinition[] | undefined
  scrollX?: number
  formatCellValue: (meta: ModuleColumnDefinition | undefined, value: unknown) => string
  getStatusMeta: (value: unknown) => StatusMeta
}>()

function getItemColumnMeta(col: TableColumn) {
  const key = String(col.dataIndex || col.key || '')
  return props.itemColumnsMeta?.find((item) => item.dataIndex === key)
}

const detailColumns = computed<ColumnDef<ModuleLineItem, unknown>[]>(() =>
  props.columns.map((col) => {
    const key = String(col.dataIndex || col.key || '')
    const meta = getItemColumnMeta(col)
    const isStatus = meta?.type === 'status'
    const width = typeof col.width === 'number' ? col.width : undefined
    const align = (col.align as 'left' | 'center' | 'right' | undefined)
    return {
      id: key,
      accessorKey: key,
      header: () => String(col.title || ''),
      cell: isStatus
        ? (info: { getValue: () => unknown }) => {
            const s = props.getStatusMeta(info.getValue())
            return h(StatusTag, { status: s.text, color: s.color })
          }
        : (info: { getValue: () => unknown }) => props.formatCellValue(meta, info.getValue()),
      meta: { width, align },
    }
  }),
)

const { table } = useDataTable({
  data: computed(() => props.items),
  columns: detailColumns,
  getRowId: (row) => String(row.id ?? ''),
  manualPagination: false,
  enableSorting: false,
})
</script>

<template>
  <DataTable
    :table="table"
    size="small"
    :scroll-x="scrollX ?? 600"
  >
    <template #empty>
      <a-empty description="当前单据暂无明细" />
    </template>
  </DataTable>
</template>
