import { Radio } from 'antd'
import { useTranslation } from 'react-i18next'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleFilterDefinition } from '@/types/module-page'
import { buildFormControlId } from '@/utils/form-control-id'
import {
  type ModuleDateRangePreset,
  resolveDateRangePresetKey,
} from '@/views/modules/components/module-date-range'
import { SEGMENTED_ALL_VALUE } from '@/views/modules/components/module-filter-utils'

interface Props {
  field: ModuleFilterDefinition
  filters: SearchParams
  datePresets: readonly ModuleDateRangePreset[]
  onCommitFilter: (key: string, value: unknown) => void
}

export function ModuleQuickDateFilter({
  field,
  filters,
  datePresets,
  onCommitFilter,
}: Props) {
  const { t } = useTranslation()
  const labelId = buildFormControlId('module-filter', `quick-date-${field.key}`)
  const activePresetKey = resolveDateRangePresetKey(
    filters[field.key],
    datePresets,
  )

  return (
    <div className="module-filter-segmented-group">
      <span id={labelId} className="module-filter-segmented-label">
        {field.label}:
      </span>
      <Radio.Group
        aria-labelledby={labelId}
        buttonStyle="solid"
        optionType="button"
        options={[
          {
            label: t('modules.filter.all'),
            value: SEGMENTED_ALL_VALUE,
          },
          ...datePresets.map((preset) => ({
            label: preset.label,
            value: preset.key,
          })),
        ]}
        value={
          activePresetKey ||
          (Array.isArray(filters[field.key]) ? undefined : SEGMENTED_ALL_VALUE)
        }
        onChange={(event) => {
          const preset = datePresets.find(
            (item) => item.key === String(event.target.value),
          )
          onCommitFilter(
            field.key,
            preset?.value.map((date) => date.format('YYYY-MM-DD')),
          )
        }}
      />
    </div>
  )
}
