import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

export interface ModuleDateRangePreset {
  key: string
  label: string
  value: [Dayjs, Dayjs]
}

export function buildDateRangePresets(t: (key: string) => string) {
  const today = dayjs()
  return [
    {
      key: 'today',
      label: t('modules.filter.today'),
      value: [today, today] as [Dayjs, Dayjs],
    },
    {
      key: 'last7Days',
      label: t('modules.filter.last7Days'),
      value: [today.subtract(6, 'day'), today] as [Dayjs, Dayjs],
    },
    {
      key: 'last30Days',
      label: t('modules.filter.last30Days'),
      value: [today.subtract(29, 'day'), today] as [Dayjs, Dayjs],
    },
    {
      key: 'thisMonth',
      label: t('modules.filter.thisMonth'),
      value: [today.startOf('month'), today.endOf('month')] as [Dayjs, Dayjs],
    },
  ]
}
