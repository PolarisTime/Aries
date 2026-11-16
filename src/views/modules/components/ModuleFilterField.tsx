import { DatePicker, Input, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleFilterDefinition } from '@/types/module-page'
import { buildFormControlId } from '@/utils/form-control-id'
import { DATE_PICKER_FORMATS } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import type { ModuleDateRangePreset } from '@/views/modules/components/module-date-range'
import { resolveFilterOptions } from '@/views/modules/components/module-filter-options'
import {
  normalizeAllOptionValue,
  SEGMENTED_ALL_VALUE,
} from '@/views/modules/components/module-filter-utils'

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
    /*
     * 下拉筛选必须**一层**：控件本身就是 Select，「全部」作为第一个选项（选中它 = 不限，
     * 提交时转成 undefined）。曾经这里套在 chip 按钮的 Popover 里，点开 popover 还要再点一次
     * Select 才出选项 —— 「套中套」既多一次点击，也让人分不清哪个才是真正的下拉。
     */
    const rawValue = filters[field.key]
    const value =
      typeof rawValue === 'string' || typeof rawValue === 'number'
        ? rawValue
        : SEGMENTED_ALL_VALUE
    return (
      <Select
        id={fieldId}
        aria-label={field.label}
        allowClear
        className="module-filter-control"
        style={{ width: '100%' }}
        placeholder={t('modules.filter.all')}
        value={value}
        onChange={(nextValue) =>
          onCommitFilter(field.key, normalizeAllOptionValue(nextValue))
        }
        options={[
          { label: t('modules.filter.all'), value: SEGMENTED_ALL_VALUE },
          ...resolveFilterOptions(field, filters, projectOptions),
        ]}
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
        className="module-filter-control module-filter-control-range"
        value={rangeValue}
        format={DATE_PICKER_FORMATS}
        presets={datePresets.map(({ label, value }) => ({ label, value }))}
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
