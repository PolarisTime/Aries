import { DatePicker, Input, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleFilterDefinition } from '@/types/module-page'
import { buildFormControlId } from '@/utils/form-control-id'
import { DISPLAY_DATE_FORMAT } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import type { ModuleDateRangePreset } from '@/views/modules/components/module-date-range'
import { resolveFilterOptions } from '@/views/modules/components/module-filter-options'

interface Props {
  field: ModuleFilterDefinition
  filters: SearchParams
  submittedFilters: SearchParams
  datePresets: readonly ModuleDateRangePreset[]
  onUpdateFilter: (key: string, value: unknown) => void
  onCommitFilter: (key: string, value: unknown) => void
  onCommitTextFilter: (key: string, value: string) => void
  projectOptions: readonly ProjectOption[]
}

export function ModuleFilterField({
  field,
  filters,
  submittedFilters,
  datePresets,
  onUpdateFilter,
  onCommitFilter,
  onCommitTextFilter,
  projectOptions,
}: Props) {
  const { t } = useTranslation()
  const fieldId = buildFormControlId('module-filter', field.key)

  if (field.type === 'select') {
    return (
      <Select
        id={fieldId}
        aria-label={field.label}
        allowClear
        style={{ width: '100%' }}
        placeholder={
          field.placeholder ||
          t('modules.filter.selectPlaceholder', { label: field.label })
        }
        value={
          typeof filters[field.key] === 'string' ||
          typeof filters[field.key] === 'number'
            ? filters[field.key]
            : undefined
        }
        onChange={(value) => onCommitFilter(field.key, value)}
        options={resolveFilterOptions(field, filters, projectOptions)}
      />
    )
  }

  if (field.type === 'dateRange') {
    const value = filters[field.key]
    const rangeValue =
      Array.isArray(value) && value.length === 2
        ? ([dayjs(String(value[0])), dayjs(String(value[1]))] as [Dayjs, Dayjs])
        : undefined

    return (
      <DatePicker.RangePicker
        id={{
          start: `${fieldId}-start`,
          end: `${fieldId}-end`,
        }}
        aria-label={field.label}
        value={rangeValue}
        format={DISPLAY_DATE_FORMAT}
        presets={datePresets.map(({ label, value }) => ({ label, value }))}
        style={{ width: '100%' }}
        onChange={(dates) => {
          const nextValue =
            dates?.[0] && dates[1]
              ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
              : undefined
          onCommitFilter(field.key, nextValue)
        }}
      />
    )
  }

  const committedValue = asString(submittedFilters[field.key])

  return (
    <Input
      id={fieldId}
      name={field.key}
      allowClear
      style={{ width: '100%' }}
      aria-keyshortcuts="Enter"
      suffix={<kbd className="keyboard-shortcut-hint">Enter</kbd>}
      placeholder={
        field.placeholder ||
        t('modules.filter.inputPlaceholder', { label: field.label })
      }
      value={asString(filters[field.key])}
      onChange={(event) => onUpdateFilter(field.key, event.target.value)}
      onBlur={(event) => {
        if (event.target.value.trim() === committedValue.trim()) return
        onCommitTextFilter(field.key, event.target.value)
      }}
      onPressEnter={(event) =>
        onCommitTextFilter(field.key, event.currentTarget.value)
      }
    />
  )
}
