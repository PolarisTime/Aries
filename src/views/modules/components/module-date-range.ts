import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { useTranslation } from 'react-i18next'

export interface ModuleDateRangePreset {
  key: string
  label: string
  value: [Dayjs, Dayjs]
}

export function buildDateRangePresets(
  t: ReturnType<typeof useTranslation>['t'],
) {
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

export function resolveDateRangePresetKey(
  value: unknown,
  presets: readonly ModuleDateRangePreset[],
) {
  if (!Array.isArray(value) || value.length !== 2) return undefined
  const serializedValue = `${value[0]}|${value[1]}`
  return presets.find(
    (preset) =>
      `${preset.value[0].format('YYYY-MM-DD')}|${preset.value[1].format('YYYY-MM-DD')}` ===
      serializedValue,
  )?.key
}
