import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { ColumnDef } from '@tanstack/vue-table'
import type { ModuleRecord } from '@/types/module-page'
import { useGridColumns } from '../use-grid-columns'

type TestColumnDef = ColumnDef<ModuleRecord, unknown> & {
  id?: string
  meta?: {
    align?: string
  }
}

describe('useGridColumns', () => {
  it('centers main list columns even when numeric config prefers right alignment', () => {
    const { tanstackColumns } = useGridColumns({
      isReadOnly: ref(false),
      visibleConfigColumns: computed(() => [
        { title: '总重量（吨）', dataIndex: 'totalWeight', width: 116, align: 'right', type: 'weight' as const },
        { title: '总金额', dataIndex: 'totalAmount', width: 110, align: 'right', type: 'amount' as const },
      ]),
      columnMetaMap: computed(() => ({
        totalWeight: { title: '总重量（吨）', dataIndex: 'totalWeight' },
        totalAmount: { title: '总金额', dataIndex: 'totalAmount' },
      })),
      formatCellValue: (_column, value) => String(value ?? ''),
      getStatusMeta: (value) => ({ text: String(value ?? ''), color: 'default' }),
    })

    const columns = tanstackColumns.value as TestColumnDef[]

    expect(columns.find((column) => column.id === 'totalWeight')?.meta?.align).toBe('center')
    expect(columns.find((column) => column.id === 'totalAmount')?.meta?.align).toBe('center')
  })
})
