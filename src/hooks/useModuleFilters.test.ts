import { describe, expect, it, vi } from 'vitest'
import { buildDefaultModuleFilters } from '@/hooks/useModuleFilters'
import type { ModulePageConfig } from '@/types/module-page'

function createDateFilterConfig(
  defaultDateRange?: ModulePageConfig['filters'][number]['defaultDateRange'],
): ModulePageConfig {
  return {
    key: 'purchase-order',
    title: '采购订单',
    kicker: '',
    description: '',
    filters: [
      {
        key: 'orderDate',
        label: '订单日期',
        type: 'dateRange',
        defaultDateRange,
      },
    ],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  }
}

describe('buildDefaultModuleFilters', () => {
  it('defaults date ranges to the previous three months through today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-28T12:00:00+08:00'))

    expect(buildDefaultModuleFilters(createDateFilterConfig())).toEqual({
      orderDate: ['2026-03-28', '2026-06-28'],
    })

    vi.useRealTimers()
  })

  it('keeps month-end dates valid when shifting three months back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-31T12:00:00+08:00'))

    expect(buildDefaultModuleFilters(createDateFilterConfig())).toEqual({
      orderDate: ['2026-02-28', '2026-05-31'],
    })

    vi.useRealTimers()
  })

  it('honors an explicitly configured date range override', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-28T12:00:00+08:00'))

    expect(
      buildDefaultModuleFilters(
        createDateFilterConfig({ monthsBefore: 1, monthsAfter: 1 }),
      ),
    ).toEqual({
      orderDate: ['2026-05-28', '2026-07-28'],
    })

    vi.useRealTimers()
  })
})
