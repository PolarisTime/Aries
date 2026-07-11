import { DownOutlined, UpOutlined } from '@ant-design/icons'
import { Button, DatePicker, Form, Input, Segmented, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveModuleActionIcon } from '@/module-system/module-action-icons'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleFilterDefinition,
  ModuleFilterOption,
  ModuleFilterOptionEntry,
  ModulePageConfig,
} from '@/types/module-page'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'
import { padLabel } from '@/utils/label-utils'
import { asString } from '@/utils/type-narrowing'

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

function normalizeFilters(filters: SearchParams) {
  const normalized: SearchParams = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    normalized[key] = value
  }
  return normalized
}

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

function getFilterFieldLabelTargetId(field: ModuleFilterDefinition) {
  const fieldId = buildFormControlId('module-filter', field.key)
  return field.type === 'dateRange' ? `${fieldId}-start` : fieldId
}

function buildNextFilters(
  baseFilters: SearchParams,
  key: string,
  value: unknown,
) {
  const nextFilters = { ...baseFilters }
  if (value === undefined || value === null || value === '') {
    delete nextFilters[key]
    return nextFilters
  }
  nextFilters[key] = value
  return normalizeFilters(nextFilters)
}

function isPrimaryFilter(field: ModuleFilterDefinition) {
  return (field.row || 1) <= 1
}

function ModuleFilterField({
  field,
  filters,
  submittedFilters,
  onUpdateFilter,
  onCommitFilter,
  onCommitTextFilter,
}: {
  field: ModuleFilterDefinition
  filters: SearchParams
  submittedFilters: SearchParams
  onUpdateFilter: (key: string, value: unknown) => void
  onCommitFilter: (key: string, value: unknown) => void
  onCommitTextFilter: (key: string, value: string) => void
}) {
  const { t } = useTranslation()
  const fieldId = buildFormControlId('module-filter', field.key)

  const resolveOptions = () => {
    const rawOptions =
      typeof field.options === 'function'
        ? field.options(filters)
        : field.options || []

    return rawOptions.map((option: ModuleFilterOptionEntry) => {
      if ('options' in option) {
        const group = option
        return {
          label: group.label,
          options: group.options.map((item: ModuleFilterOption) => ({
            label: item.label,
            value: item.value,
          })),
        }
      }

      const entry = option
      return {
        label: entry.label,
        value: entry.value,
      }
    })
  }

  if (field.type === 'select') {
    return (
      <Select
        id={fieldId}
        aria-label={field.label}
        allowClear
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
        options={resolveOptions()}
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
        className="w-full"
        onChange={(_, dateStrings) => {
          const nextValue =
            Array.isArray(dateStrings) && dateStrings[0] && dateStrings[1]
              ? dateStrings
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
  const [expanded, setExpanded] = useState(false)
  const secondaryRegionId = useId()
  const lastTextCommitAtRef = useRef(0)

  const hasConfigKeywordFilter = config.filters.some(
    (field) => field.key === 'keyword',
  )
  const sortedFilters = config.filters.toSorted(
    (left, right) => (left.row || 1) - (right.row || 1),
  )
  const primaryCapacity = hasConfigKeywordFilter ? 3 : 2
  const primaryCandidateFilters = sortedFilters.filter(isPrimaryFilter)
  const firstRowFilters = primaryCandidateFilters.slice(0, primaryCapacity)
  const overflowFilters = primaryCandidateFilters.slice(primaryCapacity)
  const secondaryFilters = [
    ...overflowFilters,
    ...sortedFilters.filter((field) => !isPrimaryFilter(field)),
  ]
  const canExpand = secondaryFilters.length > 0
  const normalizedSubmittedFilters = normalizeFilters(submittedFilters)
  const activeSecondaryFilterCount = secondaryFilters.filter(
    (field) => field.key in normalizedSubmittedFilters,
  ).length
  const quickFilters = config.quickFilters || []
  const activeQuickFilterKey = quickFilters.find((filter) =>
    isSameFilterPreset(submittedFilters, {
      ...defaultFilters,
      ...filter.values,
    }),
  )?.key
  const commitFilter = (key: string, value: unknown) => {
    onUpdateFilter(key, value)
    onApplyFilters(buildNextFilters(submittedFilters, key, value))
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

  const renderFilterItem = (field: ModuleFilterDefinition) => (
    <div key={field.key} className="module-filter-field">
      <Form.Item
        {...buildLabeledFormItemProps({
          label: padLabel(field.label),
          htmlFor: getFilterFieldLabelTargetId(field),
        })}
        className="module-filter-item"
      >
        <ModuleFilterField
          field={field}
          filters={filters}
          submittedFilters={submittedFilters}
          onUpdateFilter={onUpdateFilter}
          onCommitFilter={commitFilter}
          onCommitTextFilter={commitTextFilter}
        />
      </Form.Item>
    </div>
  )

  return (
    <Form
      colon={false}
      className="module-filter-toolbar"
      aria-label={t('modules.filter.conditions')}
    >
      {quickFilters.length ? (
        <div className="module-filter-quick-row">
          <Segmented
            aria-label={t('modules.filter.quickFilters')}
            value={activeQuickFilterKey}
            options={quickFilters.map((filter) => ({
              label: filter.label,
              value: filter.key,
            }))}
            onChange={(value) => {
              const selected = quickFilters.find(
                (filter) => filter.key === String(value),
              )
              if (selected) {
                onApplyFilters(
                  normalizeFilters({
                    ...defaultFilters,
                    ...selected.values,
                  }),
                )
              }
            }}
          />
        </div>
      ) : null}
      <div className="module-filter-main-row">
        <div className="module-filter-fields-grid">
          {!hasConfigKeywordFilter ? (
            <div className="module-filter-field">
              <Form.Item
                {...buildLabeledFormItemProps({
                  label: padLabel(t('common.keyword')),
                  htmlFor: buildFormControlId('module-filter', 'keyword'),
                })}
                className="module-filter-item"
              >
                <Input
                  id={buildFormControlId('module-filter', 'keyword')}
                  name="keyword"
                  allowClear
                  aria-keyshortcuts="Enter"
                  suffix={<kbd className="keyboard-shortcut-hint">Enter</kbd>}
                  placeholder={t('common.pleaseInput')}
                  value={asString(filters.keyword)}
                  onChange={(event) =>
                    onUpdateFilter('keyword', event.target.value)
                  }
                  onBlur={(event) => {
                    if (
                      event.target.value.trim() ===
                      asString(submittedFilters.keyword).trim()
                    ) {
                      return
                    }
                    commitTextFilter('keyword', event.target.value)
                  }}
                  onPressEnter={(event) =>
                    commitTextFilter('keyword', event.currentTarget.value)
                  }
                />
              </Form.Item>
            </div>
          ) : null}
          {firstRowFilters.map(renderFilterItem)}
        </div>
        <Form.Item className="module-filter-actions">
          {canExpand ? (
            <Button
              type="text"
              icon={expanded ? <UpOutlined /> : <DownOutlined />}
              iconPlacement="end"
              aria-controls={secondaryRegionId}
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              <span>
                {expanded ? t('common.collapse') : t('common.expand')}
              </span>
              {!expanded && activeSecondaryFilterCount > 0 ? (
                <span className="module-filter-active-count">
                  {t('modules.filter.activeCount', {
                    count: activeSecondaryFilterCount,
                  })}
                </span>
              ) : null}
            </Button>
          ) : null}
          <Button
            className="module-filter-reset-button"
            icon={resolveModuleActionIcon('重置')}
            onClick={onReset}
          >
            {t('common.reset')}
          </Button>
        </Form.Item>
      </div>
      {expanded && secondaryFilters.length ? (
        <div className="module-filter-secondary-row" id={secondaryRegionId}>
          <div className="module-filter-main-row">
            <div className="module-filter-fields-grid module-filter-secondary-grid">
              {secondaryFilters.map(renderFilterItem)}
            </div>
            <div className="module-filter-actions-placeholder" />
          </div>
        </div>
      ) : null}
    </Form>
  )
}
