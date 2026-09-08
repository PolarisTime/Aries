import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDateRangePresets } from '@/views/modules/components/module-date-range'

const t = (key: string) => key

describe('module date range presets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T12:00:00+08:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds local date presets around today', () => {
    const presets = buildDateRangePresets(t)
    expect(
      presets.map(({ key, label, value }) => ({
        key,
        label,
        value: [value[0].format('YYYY-MM-DD'), value[1].format('YYYY-MM-DD')],
      })),
    ).toEqual([
      {
        key: 'today',
        label: 'modules.filter.today',
        value: ['2026-09-03', '2026-09-03'],
      },
      {
        key: 'last7Days',
        label: 'modules.filter.last7Days',
        value: ['2026-08-28', '2026-09-03'],
      },
      {
        key: 'last30Days',
        label: 'modules.filter.last30Days',
        value: ['2026-08-05', '2026-09-03'],
      },
      {
        key: 'thisMonth',
        label: 'modules.filter.thisMonth',
        value: ['2026-09-01', '2026-09-30'],
      },
    ])
  })
})
