import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { ColumnDef } from '@tanstack/vue-table'
import type { ModuleRecord } from '@/types/module-page'
import { useGridColumns } from '../use-grid-columns'

type TestColumnDef = ColumnDef<ModuleRecord, unknown> & {
  id?: string
  meta?: {
    align?: string
    width?: number
  }
}

describe('useGridColumns', () => {
  it('centers main list columns even when numeric config prefers right alignment', () => {
    const { tanstackColumns } = useGridColumns({
      moduleKey: ref('sales-orders'),
      isReadOnly: ref(false),
      visibleConfigColumns: computed(() => [
        { title: '总重量（吨）', dataIndex: 'totalWeight', width: 116, align: 'right', type: 'weight' as const },
        { title: '总金额', dataIndex: 'totalAmount', width: 110, align: 'right', type: 'amount' as const },
      ]),
      columnMetaMap: computed(() => ({
        totalWeight: { title: '总重量（吨）', dataIndex: 'totalWeight' },
        totalAmount: { title: '总金额', dataIndex: 'totalAmount' },
      })),
      showMaterialSelectorUnitPrice: ref(true),
      formatCellValue: (_column, value) => String(value ?? ''),
      getStatusMeta: (value) => ({ text: String(value ?? ''), color: 'default' }),
    })

    const columns = tanstackColumns.value as TestColumnDef[]

    expect(columns.find((column) => column.id === 'totalWeight')?.meta?.align).toBe('center')
    expect(columns.find((column) => column.id === 'totalAmount')?.meta?.align).toBe('center')
  })

  it('hides material selector unit price when the current module is in weight-only mode', () => {
    const { materialSelectorColumns } = useGridColumns({
      moduleKey: ref('sales-orders'),
      isReadOnly: ref(false),
      visibleConfigColumns: computed(() => []),
      columnMetaMap: computed(() => ({})),
      showMaterialSelectorUnitPrice: ref(false),
      formatCellValue: (_column, value) => String(value ?? ''),
      getStatusMeta: (value) => ({ text: String(value ?? ''), color: 'default' }),
    })

    const columnIds = (materialSelectorColumns.value as TestColumnDef[]).map((column) => String(column.id ?? ''))
    expect(columnIds).not.toContain('unitPrice')
  })

  it('uses module-specific action column title and width', () => {
    const { tanstackColumns } = useGridColumns({
      moduleKey: ref('sales-outbounds'),
      isReadOnly: ref(false),
      visibleConfigColumns: computed(() => []),
      columnMetaMap: computed(() => ({})),
      showMaterialSelectorUnitPrice: ref(true),
      formatCellValue: (_column, value) => String(value ?? ''),
      getStatusMeta: (value) => ({ text: String(value ?? ''), color: 'default' }),
    })

    const actionColumn = (tanstackColumns.value as TestColumnDef[]).find((column) => column.id === 'action')

    expect((actionColumn?.header as (() => string))()).toBe('附件')
    expect(actionColumn?.meta?.width).toBe(84)
  })

  it('defaults generic modules to attachment-only action column styling', () => {
    const { tanstackColumns } = useGridColumns({
      moduleKey: ref('sales-orders'),
      isReadOnly: ref(false),
      visibleConfigColumns: computed(() => []),
      columnMetaMap: computed(() => ({})),
      showMaterialSelectorUnitPrice: ref(true),
      formatCellValue: (_column, value) => String(value ?? ''),
      getStatusMeta: (value) => ({ text: String(value ?? ''), color: 'default' }),
    })

    const actionColumn = (tanstackColumns.value as TestColumnDef[]).find((column) => column.id === 'action')

    expect((actionColumn?.header as (() => string))()).toBe('附件')
    expect(actionColumn?.meta?.width).toBe(84)
  })
})
