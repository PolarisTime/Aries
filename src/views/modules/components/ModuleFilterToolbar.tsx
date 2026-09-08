import { DownOutlined } from '@ant-design/icons'
import { Button, Form, Input, Popover, Radio, Select } from 'antd'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleFilterDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { ModuleFilterField } from '@/views/modules/components/ModuleFilterField'
import { buildDateRangePresets } from '@/views/modules/components/module-date-range'
import { resolveFilterOptions } from '@/views/modules/components/module-filter-options'
import {
  buildNextFilters,
  normalizeFilters,
  resolveSegmentedFilterValue,
  SEGMENTED_ALL_VALUE,
  toSegmentedOptions,
} from '@/views/modules/components/module-filter-utils'

interface Props {
  config: ModulePageConfig
  filters: SearchParams
  defaultFilters?: SearchParams
  submittedFilters: SearchParams
  onUpdateFilter: (key: string, value: unknown) => void
  onApplyFilters: (filters: SearchParams) => void
  onReset: () => void
}

const EMPTY_FILTERS: SearchParams = {}

function isSameFilterPreset(left: SearchParams, right: SearchParams) {
  const leftEntries = Object.entries(normalizeFilters(left)).toSorted()
  const rightEntries = Object.entries(normalizeFilters(right)).toSorted()
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([key, value], index) => {
      const [rightKey, rightValue] = rightEntries[index]
      return key === rightKey && String(value) === String(rightValue)
    })
  )
}

/** 筛选是否已设置有效值（用于 chip 高亮） */
function hasActiveValue(value: unknown) {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value)) return value.some((item) => item)
  return true
}

export function ModuleFilterToolbar({
  config,
  filters,
  defaultFilters = EMPTY_FILTERS,
  submittedFilters,
  onUpdateFilter,
  onApplyFilters,
  onReset,
}: Props) {
  const { t } = useTranslation()
  const lastTextCommitAtRef = useRef(0)
  const optionRequirements = resolveMasterOptionRequirements(config.filters)
  const customerId = asString(filters.customerId).trim() || undefined
  const { projects: projectOptions } = useMasterOptions(
    optionRequirements,
    true,
    customerId,
  )
  const [openChipKey, setOpenChipKey] = useState<string | null>(null)
  const closeChip = () => setOpenChipKey(null)
  const toggleChip = (key: string, open: boolean) =>
    setOpenChipKey(open ? key : null)

  const sortedFilters = config.filters.toSorted(
    (left, right) => (left.row || 1) - (right.row || 1),
  )
  const quickFilters = config.quickFilters || []
  const datePresets = useMemo(() => buildDateRangePresets(t), [t])
  const activeQuickFilterKey = quickFilters.find((filter) =>
    isSameFilterPreset(submittedFilters, {
      ...defaultFilters,
      ...filter.values,
    }),
  )?.key
  const commitFilter = (
    key: string,
    value: unknown,
    resetKeys: readonly string[] = [],
  ) => {
    onUpdateFilter(key, value)
    onApplyFilters(buildNextFilters(submittedFilters, key, value, resetKeys))
  }

  const commitTextFilter = (key: string, value: string) => {
    const now = Date.now()
    if (now - lastTextCommitAtRef.current < 100) return
    lastTextCommitAtRef.current = now

    const normalizedValue = value.trim()
    onUpdateFilter(key, normalizedValue)
    onApplyFilters(
      buildNextFilters(
        {
          ...submittedFilters,
          ...normalizeFilters(
            Object.fromEntries(
              Object.entries(filters).filter(
                ([filterKey]) =>
                  config.filters.find((field) => field.key === filterKey)
                    ?.type !== 'input',
              ),
            ),
          ),
        },
        key,
        normalizedValue,
      ),
    )
  }

  const hasConfigKeywordFilter = config.filters.some(
    (field) => field.key === 'keyword',
  )
  const pillFilters = sortedFilters.filter((field) => field.type === 'input')
  const dateRangeFilters = sortedFilters.filter(
    (field) => field.type === 'dateRange',
  )
  const chipFilters = sortedFilters.filter(
    (field) => field.type !== 'input' && field.type !== 'dateRange',
  )

  const renderTextPill = (
    key: string,
    label: string,
    placeholder: string,
    committedValue: string,
  ) => (
    <Input
      key={key}
      name={key}
      allowClear
      aria-label={label}
      aria-keyshortcuts="Enter"
      className="module-filter-pill module-filter-pill-input"
      style={{ width: 176, borderRadius: 999 }}
      suffix={<kbd className="keyboard-shortcut-hint">Enter</kbd>}
      placeholder={placeholder}
      value={asString(filters[key])}
      onChange={(event) => onUpdateFilter(key, event.target.value)}
      onBlur={(event) => {
        if (event.target.value.trim() === committedValue.trim()) return
        commitTextFilter(key, event.target.value)
      }}
      onPressEnter={(event) => commitTextFilter(key, event.currentTarget.value)}
    />
  )

  const renderChip = (field: ModuleFilterDefinition) => {
    const options = toSegmentedOptions(
      resolveFilterOptions(field, filters, projectOptions),
    )
    const value = filters[field.key]
    const active = hasActiveValue(value)
    const selectedLabel = options.find(
      (option) => String(option.value) === String(value ?? ''),
    )?.label
    const isOpen = openChipKey === field.key
    const ariaLabel = `${field.label}: ${active ? (selectedLabel ?? String(value)) : t('modules.filter.all')}`
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
              commitFilter(field.key, nextValue, field.resetKeysOnChange)
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
        key={field.key}
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        open={isOpen}
        onOpenChange={(open) => toggleChip(field.key, open)}
        content={popoverContent}
        overlayClassName="module-filter-chip-popover"
      >
        <button
          type="button"
          className={`module-filter-chip${active ? ' module-filter-chip-active' : ''}`}
          aria-expanded={isOpen}
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

  const quickFilterChip =
    quickFilters.length > 0 ? (
      <Popover
        key="quick-filters"
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        open={openChipKey === 'quick-filters'}
        onOpenChange={(open) => toggleChip('quick-filters', open)}
        content={
          <Radio.Group
            aria-label={t('modules.filter.quickFilters')}
            className="module-filter-chip-options"
            value={activeQuickFilterKey}
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
          className={`module-filter-chip${activeQuickFilterKey ? ' module-filter-chip-active' : ''}`}
          aria-expanded={openChipKey === 'quick-filters'}
          aria-haspopup="listbox"
          aria-label={t('modules.filter.quickFilters')}
        >
          <span className="module-filter-chip-label">
            {t('modules.filter.quickFilters')}
          </span>
          {activeQuickFilterKey ? (
            <span className="module-filter-chip-value">
              {
                quickFilters.find(
                  (filter) => filter.key === activeQuickFilterKey,
                )?.label
              }
            </span>
          ) : null}
          <DownOutlined className="module-filter-chip-caret" />
        </button>
      </Popover>
    ) : null

  return (
    <Form
      colon={false}
      className="module-filter-toolbar module-filter-chip-toolbar"
      aria-label={t('modules.filter.conditions')}
    >
      <div className="module-filter-chip-row">
        {!config.hideKeywordFilter && !hasConfigKeywordFilter
          ? renderTextPill(
              'keyword',
              t('common.keyword'),
              t('common.pleaseInput'),
              asString(submittedFilters.keyword),
            )
          : null}
        {pillFilters.map((field) =>
          renderTextPill(
            field.key,
            field.label,
            field.placeholder ||
              t('modules.filter.inputPlaceholder', { label: field.label }),
            asString(submittedFilters[field.key]),
          ),
        )}
        {dateRangeFilters.map((field) => (
          <div
            key={field.key}
            className="module-filter-pill module-filter-pill-date"
          >
            <ModuleFilterField
              field={field}
              filters={filters}
              submittedFilters={submittedFilters}
              datePresets={datePresets}
              onUpdateFilter={onUpdateFilter}
              onCommitFilter={(key, value) =>
                commitFilter(key, value, field.resetKeysOnChange)
              }
              onCommitTextFilter={commitTextFilter}
              projectOptions={projectOptions}
            />
          </div>
        ))}
        {chipFilters.map((field) => renderChip(field))}
        {quickFilterChip}
        <Button
          className="module-filter-reset-button"
          type="text"
          size="small"
          icon={resolveModuleActionIcon('重置')}
          onClick={onReset}
        >
          {t('common.reset')}
        </Button>
      </div>
    </Form>
  )
}
