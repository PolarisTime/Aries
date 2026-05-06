import { computed, h, type Ref } from 'vue'
import { Checkbox } from 'ant-design-vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import type { ModuleColumnDefinition, ModuleRecord } from '@/types/module-page'
import type { StatusMeta } from '@/composables/use-module-display-support'
import StatusTag from '@/components/StatusTag.vue'
import { isTagListColumnKey, isFriendlyTagColumnKey, getTagListValues, getFriendlyTagColor } from './module-adapter-shared'

interface GridColumnDeps {
  isReadOnly: Ref<boolean>
  visibleConfigColumns: Ref<ModuleColumnDefinition[]>
  columnMetaMap: Ref<Record<string, ModuleColumnDefinition>>
  showMaterialSelectorUnitPrice: Ref<boolean>
  formatCellValue: (column: ModuleColumnDefinition | undefined, value: unknown) => string
  getStatusMeta: (value: unknown) => StatusMeta
}

export function useGridColumns(deps: GridColumnDeps) {
  const { isReadOnly, visibleConfigColumns, columnMetaMap, showMaterialSelectorUnitPrice, formatCellValue, getStatusMeta } = deps

  const tanstackColumns = computed<ColumnDef<ModuleRecord, unknown>[]>(() => [
    {
      id: 'selection',
      header: ({ table }: { table: { getIsAllRowsSelected: () => boolean; getIsSomeRowsSelected: () => boolean; toggleAllRowsSelected: (v: boolean) => void } }) =>
        h(Checkbox, {
          checked: table.getIsAllRowsSelected(),
          indeterminate: table.getIsSomeRowsSelected(),
          'onUpdate:checked': (checked: boolean) => table.toggleAllRowsSelected(checked),
        }),
      cell: ({ row }: { row: { getIsSelected: () => boolean; getCanSelect: () => boolean; toggleSelected: (v: boolean) => void } }) =>
        h(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          'onUpdate:checked': (checked: boolean) => row.toggleSelected(checked),
        }),
      meta: { width: 48, align: 'center' as const, fixed: 'left' as const },
    },
    {
      id: 'action',
      header: () => '操作',
      meta: { width: isReadOnly.value ? 84 : 232, align: 'center' as const, fixed: 'left' as const },
    },
    ...visibleConfigColumns.value.map((column) => {
      const colMeta = columnMetaMap.value[column.dataIndex]
      const isStatus = column.type === 'status'
      const isTag = isTagListColumnKey(column.dataIndex)
      const isFriendly = isFriendlyTagColumnKey(column.dataIndex)
      return {
        id: column.dataIndex,
        accessorKey: column.dataIndex,
        header: () => column.title,
        cell: isTag
          ? (info: { getValue: () => unknown }) => {
              const tags = getTagListValues(info.getValue())
              return tags.map((t: string) => h('span', { class: 'ant-tag ant-tag-processing', style: 'margin-right: 4px' }, t))
            }
          : isFriendly
          ? (info: { getValue: () => unknown; column: { id: string } }) => {
              const v = info.getValue()
              const c = getFriendlyTagColor(info.column.id, v)
              const text = formatCellValue(colMeta, v)
              return h('span', { class: `ant-tag ant-tag-${c}` }, text)
            }
          : isStatus
          ? (info: { getValue: () => unknown }) => {
              const s = getStatusMeta(info.getValue())
              return h(StatusTag, { status: s.text, color: s.color })
            }
          : (info: { getValue: () => unknown }) => formatCellValue(colMeta, info.getValue()),
        meta: {
          width: column.width,
          align: 'center' as const,
        },
      }
    }),
  ])

  const materialColumnHelper = createColumnHelper<ModuleRecord>()
  const materialSelectorColumns = computed<ColumnDef<ModuleRecord, unknown>[]>(() => {
    const columns: ColumnDef<ModuleRecord, unknown>[] = [
      materialColumnHelper.accessor('materialCode', { header: () => '商品编码', meta: { width: 160 } }),
      materialColumnHelper.accessor('brand', { header: () => '品牌', meta: { width: 120 } }),
      materialColumnHelper.accessor('material', { header: () => '材质', meta: { width: 120 } }),
      materialColumnHelper.accessor('spec', { header: () => '规格', meta: { width: 120 } }),
      materialColumnHelper.accessor('length', { header: () => '长度', meta: { width: 100 } }),
      materialColumnHelper.accessor('unit', { header: () => '单位', meta: { width: 90 } }),
    ]

    if (showMaterialSelectorUnitPrice.value) {
      columns.push(materialColumnHelper.accessor('unitPrice', {
        header: () => '单价',
        cell: (info) => formatCellValue(undefined, info.getValue()),
        meta: { width: 110, align: 'right' },
      }))
    }

    return columns
  })

  const freightSummaryColumns = computed<ColumnDef<ModuleRecord, unknown>[]>(() => [
    materialColumnHelper.accessor('carrierName', { header: () => '物流商' }),
    materialColumnHelper.accessor('statementCount', { header: () => '对账单数', meta: { width: 100, align: 'right' } }),
    materialColumnHelper.accessor('totalWeight', {
      header: () => '总重量（吨）',
      cell: (info) => formatCellValue(undefined, info.getValue()),
      meta: { width: 120, align: 'right' },
    }),
    materialColumnHelper.accessor('totalFreight', {
      header: () => '总运费',
      cell: (info) => formatCellValue(undefined, info.getValue()),
      meta: { width: 120, align: 'right' },
    }),
    materialColumnHelper.accessor('paidAmount', {
      header: () => '已付金额',
      cell: (info) => formatCellValue(undefined, info.getValue()),
      meta: { width: 120, align: 'right' },
    }),
    materialColumnHelper.accessor('unpaidAmount', {
      header: () => '未付金额',
      cell: (info) => formatCellValue(undefined, info.getValue()),
      meta: { width: 120, align: 'right' },
    }),
  ])

  return {
    tanstackColumns,
    materialSelectorColumns,
    freightSummaryColumns,
  }
}
