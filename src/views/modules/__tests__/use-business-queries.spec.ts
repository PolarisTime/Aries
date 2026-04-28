import { findRowsByRelation } from '@/views/modules/use-business-queries'
import type { ModuleRecord } from '@/types/module-page'

describe('use-business-queries', () => {
  it('matches downstream rows by configured relation field', () => {
    const rows: ModuleRecord[] = [
      { id: '1', salesOrderNo: 'SO-001, SO-002', status: '草稿' },
      { id: '2', salesOrderNo: 'SO-003，SO-004', status: '已审核' },
      { id: '3', salesOrderNo: '', status: '已审核' },
    ]

    expect(findRowsByRelation(rows, 'salesOrderNo', 'SO-004')).toEqual([
      { id: '2', salesOrderNo: 'SO-003，SO-004', status: '已审核' },
    ])
    expect(findRowsByRelation(rows, 'salesOrderNo', 'SO-005')).toEqual([])
    expect(findRowsByRelation(rows, '', 'SO-001')).toEqual([])
  })
})
