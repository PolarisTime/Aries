import { describe, expect, it } from 'vitest'
import type { ModuleColumnDefinition } from '@/types/module-page-fields'
import { buildDetailItemColumns } from './module-record-detail-columns'

const columns: ModuleColumnDefinition[] = [
  { title: '仓库', dataIndex: 'warehouseName' },
  { title: '数量', dataIndex: 'quantity', type: 'count', align: 'center' },
  { title: '件重', dataIndex: 'pieceWeightTon', type: 'weight' },
  { title: '金额', dataIndex: 'amount', type: 'amount' },
  { title: '备注', dataIndex: 'remark', align: 'right' },
]

const build = () =>
  buildDetailItemColumns({
    columns,
    formatCellValue: (value) => String(value ?? ''),
  })

describe('详情只读明细列对齐', () => {
  it('金额/重量/件数列打上右对齐标记，文本列不打', () => {
    const built = build()

    expect(built[1].className).toBe('module-detail-table-cell--numeric')
    expect(built[2].className).toBe('module-detail-table-cell--numeric')
    expect(built[3].className).toBe('module-detail-table-cell--numeric')
    expect(built[0].className).toBeUndefined()
    expect(built[4].className).toBeUndefined()
  })

  it('列配置里的 align 仍然保留（非数值列不受影响）', () => {
    const built = build()

    expect(built[0].align).toBe('center')
    expect(built[4].align).toBe('right')
  })

  it('空列配置返回空数组', () => {
    expect(
      buildDetailItemColumns({
        columns: [],
        formatCellValue: (value) => String(value ?? ''),
      }),
    ).toEqual([])
  })
})
