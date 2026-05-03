import { nextTick, ref } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { describe, expect, it } from 'vitest'
import { useDataTable } from '../use-data-table'

interface Row {
  id: string
  name: string
}

describe('useDataTable', () => {
  it('reacts when columns are initialized after table creation', async () => {
    const rows = ref<Row[]>([{ id: '1', name: '测试客户' }])
    const columns = ref<ColumnDef<Row, unknown>[]>([
      { id: 'action', header: () => '操作' },
    ])

    const { table } = useDataTable({
      data: rows,
      columns,
      getRowId: (row) => row.id,
    })

    expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual(['action'])

    columns.value = [
      { id: 'action', header: () => '操作' },
      { accessorKey: 'name', header: () => '名称' },
    ]
    await nextTick()

    expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual(['action', 'name'])
    expect(table.getRowModel().rows[0]?.getVisibleCells().map((cell) => cell.column.id)).toEqual(['action', 'name'])
  })
})
