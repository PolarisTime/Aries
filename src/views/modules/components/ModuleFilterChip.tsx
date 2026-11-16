import { DownOutlined } from '@ant-design/icons'
import { Popover, Radio } from 'antd'
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
  normalizeAllOptionValue,
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

/** 分段筛选 chip（按钮 + Radio 面板）。下拉筛选已改为内联 Select，不再走这里。 */
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
  /*
   * 面板里只放 Radio 组（一层）：下拉筛选已经改为内联 Select，不再走这里 ——
   * 曾经的「chip → Popover → Select」是用户反馈的「套中套」。
   */
  const popoverContent = (
    <Radio.Group
      aria-label={field.label}
      className="module-filter-chip-options"
      value={resolveSegmentedFilterValue(value)}
      onChange={(event) => {
        const nextValue = normalizeAllOptionValue(String(event.target.value))
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
      classNames={{ root: 'module-filter-chip-popover' }}
    >
      {/*
        字段名由外壳 `.module-filter-field-label` 渲染（表单式：标签在控件左侧），
        按钮里只留当前值 + 展开箭头；未选时显示「全部」而不是把字段名再写一遍。
        aria-label 仍是「字段: 值」，读屏用户不需要靠视觉关联。
      */}
      <button
        type="button"
        className={`module-filter-chip module-filter-control${active ? ' module-filter-control-active' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <span className="module-filter-chip-value">
          {active && selectedLabel ? selectedLabel : t('modules.filter.all')}
        </span>
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
      classNames={{ root: 'module-filter-chip-popover' }}
    >
      {/*
        快捷筛选是"整套预置"的切换器，不是某个字段的取值框，所以做成行末的弱化文字按钮
        （无边框、主色文字），不与字段控件抢视觉重量。
      */}
      <button
        type="button"
        className={`module-filter-link${activeKey ? ' module-filter-link-active' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('modules.filter.quickFilters')}
      >
        <span>{t('modules.filter.quickFilters')}</span>
        {activeKey ? (
          <span className="module-filter-link-value">
            {quickFilters.find((filter) => filter.key === activeKey)?.label}
          </span>
        ) : null}
        <DownOutlined className="module-filter-chip-caret" />
      </button>
    </Popover>
  )
}
