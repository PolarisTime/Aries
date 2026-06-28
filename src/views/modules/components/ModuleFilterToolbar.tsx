import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Segmented,
  Select,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useRef, useState } from 'react'
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

function hasSecondaryFilters(filters: ModuleFilterDefinition[]) {
  return filters.some((field) => (field.row || 1) > 1)
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
  onCommitTextFilter: (key: string, value: unknown) => void
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
          typeof filters[field.key] === 'string'
            ? asString(filters[field.key])
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
  defaultFilters = {},
  submittedFilters,
  onUpdateFilter,
  onApplyFilters,
  onReset,
}: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const lastTextCommitAtRef = useRef(0)

  const hasConfigKeywordFilter = config.filters.some(
    (field) => field.key === 'keyword',
  )
  const sortedFilters = config.filters.toSorted(
    (left, right) => (left.row || 1) - (right.row || 1),
  )
  const visibleFilters = expanded
    ? sortedFilters
    : sortedFilters.filter((field) => (field.row || 1) <= 1)
  const canExpand = hasSecondaryFilters(sortedFilters)
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

  const commitTextFilter = (key: string, value: unknown) => {
    const now = Date.now()
    if (now - lastTextCommitAtRef.current < 100) return
    lastTextCommitAtRef.current = now

    const normalizedValue =
      typeof value === 'string' ? value.trim() : String(value ?? '').trim()
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

  return (
    <Form colon={false} className="mb-4">
      <Row gutter={[16, 8]}>
        {quickFilters.length ? (
          <Col xs={24}>
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
          </Col>
        ) : null}
        {!hasConfigKeywordFilter ? (
          <Col xs={24} sm={12} lg={8} xl={6}>
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
          </Col>
        ) : null}
        {visibleFilters.map((field) => (
          <Col key={field.key} xs={24} sm={12} lg={8} xl={6}>
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
          </Col>
        ))}
        <Col xs={24}>
          <Form.Item className="module-filter-actions">
            {canExpand ? (
              <Button
                type="text"
                icon={resolveModuleActionIcon(expanded ? '收起' : '展开')}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? t('common.collapse') : t('common.expand')}
              </Button>
            ) : null}
            <Button icon={resolveModuleActionIcon('重置')} onClick={onReset}>
              {t('common.reset')}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}
