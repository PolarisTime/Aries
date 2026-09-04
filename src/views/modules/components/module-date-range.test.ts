import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildDateRangePresets,
  resolveDateRangePresetKey,
} from '@/views/modules/components/module-date-range'

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

  it('resolves the active preset only for an exact date range', () => {
    const presets = buildDateRangePresets(t)

    expect(
      resolveDateRangePresetKey(['2026-08-28', '2026-09-03'], presets),
    ).toBe('last7Days')
    expect(
      resolveDateRangePresetKey(['2026-08-29', '2026-09-03'], presets),
    ).toBeUndefined()
    expect(resolveDateRangePresetKey(['2026-08-28'], presets)).toBeUndefined()
    expect(resolveDateRangePresetKey(undefined, presets)).toBeUndefined()
  })
})
