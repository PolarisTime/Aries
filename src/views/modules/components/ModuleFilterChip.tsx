import { DownOutlined } from '@ant-design/icons'
import { Popover, Radio, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleFilterDefinition,
  ModuleQuickFilterDefinition,
} from '@/types/module-page'
import { resolveFilterOptions } from '@/views/modules/components/module-filter-options'
import {
  buildNextFilters,
  normalizeFilters,
  resolveSegmentedFilterValue,
  SEGMENTED_ALL_VALUE,
  toSegmentedOptions,
} from '@/views/modules/components/module-filter-utils'

/** 筛选是否已设置有效值（用于 chip 高亮） */
function hasActiveValue(value: unknown) {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value)) return value.some((item) => item)
  return true
}

interface ChipProps {
  field: ModuleFilterDefinition
  filters: SearchParams
  submittedFilters: SearchParams
  projectOptions: readonly ProjectOption[]
  open: boolean
  onToggle: (open: boolean) => void
  onUpdateFilter: (key: string, value: unknown) => void
  onApplyFilters: (filters: SearchParams) => void
}

/** 单个分段/下拉筛选 chip：按钮 + 弹出面板，提交行为与工具栏一致。 */
export function ModuleFilterChip({
  field,
  filters,
  submittedFilters,
  projectOptions,
  open,
  onToggle,
  onUpdateFilter,
  onApplyFilters,
}: ChipProps) {
  const { t } = useTranslation()
  const options = toSegmentedOptions(
    resolveFilterOptions(field, filters, projectOptions),
  )
  const value = filters[field.key]
  const active = hasActiveValue(value)
  const selectedLabel = options.find(
    (option) => String(option.value) === String(value ?? ''),
  )?.label
  const ariaLabel = `${field.label}: ${active ? (selectedLabel ?? String(value)) : t('modules.filter.all')}`
  const closeChip = () => onToggle(false)
  const popoverContent =
    field.type === 'select' ? (
      <div className="module-filter-chip-panel">
        <Select
          autoFocus
          allowClear
          aria-label={field.label}
          style={{ width: '100%' }}
          placeholder={
            field.placeholder ||
            t('modules.filter.selectPlaceholder', { label: field.label })
          }
          value={
            typeof value === 'string' || typeof value === 'number'
              ? value
              : undefined
          }
          onChange={(nextValue) => {
            onUpdateFilter(field.key, nextValue)
            onApplyFilters(
              buildNextFilters(
                submittedFilters,
                field.key,
                nextValue,
                field.resetKeysOnChange,
              ),
            )
            closeChip()
          }}
          options={resolveFilterOptions(field, filters, projectOptions)}
        />
      </div>
    ) : (
      <Radio.Group
        aria-label={field.label}
        className="module-filter-chip-options"
        value={resolveSegmentedFilterValue(value)}
        onChange={(event) => {
          const rawValue = String(event.target.value)
          const nextValue =
            rawValue === SEGMENTED_ALL_VALUE ? undefined : rawValue
          onUpdateFilter(field.key, nextValue)
          onApplyFilters(
            buildNextFilters(
              submittedFilters,
              field.key,
              nextValue,
              field.resetKeysOnChange,
            ),
          )
          closeChip()
        }}
        options={[
          { label: t('modules.filter.all'), value: SEGMENTED_ALL_VALUE },
          ...options,
        ]}
      />
    )

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      open={open}
      onOpenChange={onToggle}
      content={popoverContent}
      overlayClassName="module-filter-chip-popover"
    >
      <button
        type="button"
        className={`module-filter-chip${active ? ' module-filter-chip-active' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <span className="module-filter-chip-label">{field.label}</span>
        {active && selectedLabel ? (
          <span className="module-filter-chip-value">{selectedLabel}</span>
        ) : null}
        <DownOutlined className="module-filter-chip-caret" />
      </button>
    </Popover>
  )
}

interface QuickFilterChipProps {
  quickFilters: ModuleQuickFilterDefinition[]
  defaultFilters: SearchParams
  activeKey: string | undefined
  open: boolean
  onToggle: (open: boolean) => void
  onApplyFilters: (filters: SearchParams) => void
}

/** 快捷筛选 chip：弹出面板内单选即应用整套预设筛选。 */
export function ModuleQuickFilterChip({
  quickFilters,
  defaultFilters,
  activeKey,
  open,
  onToggle,
  onApplyFilters,
}: QuickFilterChipProps) {
  const { t } = useTranslation()
  if (!quickFilters.length) return null
  const closeChip = () => onToggle(false)

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      open={open}
      onOpenChange={onToggle}
      content={
        <Radio.Group
          aria-label={t('modules.filter.quickFilters')}
          className="module-filter-chip-options"
          value={activeKey}
          onChange={(event) => {
            const selected = quickFilters.find(
              (filter) => filter.key === String(event.target.value),
            )
            if (selected) {
              onApplyFilters(
                normalizeFilters({
                  ...defaultFilters,
                  ...selected.values,
                }),
              )
            }
            closeChip()
          }}
          options={quickFilters.map((filter) => ({
            label: filter.label,
            value: filter.key,
          }))}
        />
      }
      overlayClassName="module-filter-chip-popover"
    >
      <button
        type="button"
        className={`module-filter-chip${activeKey ? ' module-filter-chip-active' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('modules.filter.quickFilters')}
      >
        <span className="module-filter-chip-label">
          {t('modules.filter.quickFilters')}
        </span>
        {activeKey ? (
          <span className="module-filter-chip-value">
            {quickFilters.find((filter) => filter.key === activeKey)?.label}
          </span>
        ) : null}
        <DownOutlined className="module-filter-chip-caret" />
      </button>
    </Popover>
  )
}
