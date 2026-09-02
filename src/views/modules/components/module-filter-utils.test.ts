import { describe, expect, it } from 'vitest'
import {
  buildNextFilters,
  normalizeFilters,
  resolveSegmentedFilterValue,
  SEGMENTED_ALL_VALUE,
  toSegmentedOptions,
} from '@/views/modules/components/module-filter-utils'

describe('module filter utilities', () => {
  it('maps empty or missing values to the segmented all option', () => {
    expect(resolveSegmentedFilterValue(undefined)).toBe(SEGMENTED_ALL_VALUE)
    expect(resolveSegmentedFilterValue('')).toBe(SEGMENTED_ALL_VALUE)
    expect(resolveSegmentedFilterValue('   ')).toBe(SEGMENTED_ALL_VALUE)
  })

  it('keeps valid segmented values as-is', () => {
    expect(resolveSegmentedFilterValue('草稿')).toBe('草稿')
    expect(resolveSegmentedFilterValue('123')).toBe('123')
  })

  it('flattens grouped options and stringifies values', () => {
    expect(
      toSegmentedOptions([
        { label: '草稿', value: '草稿' },
        {
          label: '分组',
          options: [{ label: '待确认', value: 1 }],
        },
      ]),
    ).toEqual([
      { label: '草稿', value: '草稿' },
      { label: '待确认', value: '1' },
    ])
  })

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
