import { describe, expect, it } from 'vitest'
import {
  filterImportableParentRecords,
  resolveSelectedParentRows,
} from './module-parent-selector-utils'

const TARGET_ORDER_ID = '350692799655452672'

describe('上游单据选择器数据工具', () => {
  it('物流候选订单使用字符串主键时可进入可勾选集合', () => {
    const rows = [
      {
        id: TARGET_ORDER_ID,
        status: '完成销售',
        deletedFlag: false,
        items: [{ id: '350692800100048896' }],
      },
    ]

    const visibleRows = filterImportableParentRecords(
      'sales-order',
      rows,
      undefined,
      'freight-sales-order-import',
    )
    const selectedRows = resolveSelectedParentRows(
      [TARGET_ORDER_ID],
      {},
      visibleRows,
    )

    expect(selectedRows).toHaveLength(1)
    expect(selectedRows[0]?.id).toBe(TARGET_ORDER_ID)
  })
})
