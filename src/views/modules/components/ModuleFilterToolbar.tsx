import { Button, Form, Input } from 'antd'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { ModuleFilterField } from '@/views/modules/components/ModuleFilterField'
import { buildDateRangePresets } from '@/views/modules/components/module-date-range'
import {
  buildNextFilters,
  normalizeFilters,
} from '@/views/modules/components/module-filter-utils'
import { ModuleFilterChip, ModuleQuickFilterChip } from './ModuleFilterChip'

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
        {chipFilters.map((field) => (
          <ModuleFilterChip
            key={field.key}
            field={field}
            filters={filters}
            submittedFilters={submittedFilters}
            projectOptions={projectOptions}
            open={openChipKey === field.key}
            onToggle={(open) => toggleChip(field.key, open)}
            onUpdateFilter={onUpdateFilter}
            onApplyFilters={onApplyFilters}
          />
        ))}
        <ModuleQuickFilterChip
          quickFilters={quickFilters}
          defaultFilters={defaultFilters}
          activeKey={activeQuickFilterKey}
          open={openChipKey === 'quick-filters'}
          onToggle={(open) => toggleChip('quick-filters', open)}
          onApplyFilters={onApplyFilters}
        />
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
