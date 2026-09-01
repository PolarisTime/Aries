import { describe, expect, it } from 'vitest'
import {
  buildNextFilters,
  normalizeFilters,
} from '@/views/modules/components/module-filter-utils'

describe('module filter utilities', () => {
  it('clears pending-only mode when a status filter changes', () => {
    expect(
      buildNextFilters({ pendingOnly: 'true' }, 'status', '完成采购', [
        'pendingOnly',
      ]),
    ).toEqual({ status: '完成采购' })
  })

  it('clears the status and reset keys when a select is cleared', () => {
    expect(
      buildNextFilters(
        { pendingOnly: 'true', status: '完成采购' },
        'status',
        undefined,
        ['pendingOnly'],
      ),
    ).toEqual({})
  })

  it('removes empty values without changing valid filters', () => {
    expect(
      normalizeFilters({ keyword: '', status: '已审核', pendingOnly: null }),
    ).toEqual({ status: '已审核' })
  })
})
