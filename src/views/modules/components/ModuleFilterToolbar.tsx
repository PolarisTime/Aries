import { Button, Col, Form, Input, Row, Segmented, Space } from 'antd'
import { useMemo, useRef } from 'react'
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
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'
import { padLabel } from '@/utils/label-utils'
import { asString } from '@/utils/type-narrowing'
import { ModuleFilterField } from '@/views/modules/components/ModuleFilterField'
import { ModuleQuickDateFilter } from '@/views/modules/components/ModuleQuickDateFilter'
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

function getFilterFieldLabelTargetId(field: ModuleFilterDefinition) {
  const fieldId = buildFormControlId('module-filter', field.key)
  return field.type === 'dateRange' ? `${fieldId}-start` : fieldId
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

  const hasConfigKeywordFilter = config.filters.some(
    (field) => field.key === 'keyword',
  )
  const sortedFilters = config.filters.toSorted(
    (left, right) => (left.row || 1) - (right.row || 1),
  )
  const segmentedFilters = sortedFilters.filter(
    (field) => field.type === 'segmented',
  )
  const dateRangeFilter = sortedFilters.find(
    (field) => field.type === 'dateRange',
  )
  const gridFilters = sortedFilters.filter(
    (field) => field.type !== 'segmented',
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

  const commitSegmentedFilter = (
    field: ModuleFilterDefinition,
    rawValue: string,
  ) => {
    const value = rawValue === SEGMENTED_ALL_VALUE ? undefined : rawValue
    onUpdateFilter(field.key, value)
    onApplyFilters(
      buildNextFilters(
        submittedFilters,
        field.key,
        value,
        field.resetKeysOnChange,
      ),
    )
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
    <Col key={field.key} xs={24} sm={12} xl={6} className="module-filter-field">
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
          datePresets={datePresets}
          onUpdateFilter={onUpdateFilter}
          onCommitFilter={(key, value) =>
            commitFilter(key, value, field.resetKeysOnChange)
          }
          onCommitTextFilter={commitTextFilter}
          projectOptions={projectOptions}
        />
      </Form.Item>
    </Col>
  )

  const renderQuickDateFilters = () =>
    dateRangeFilter ? (
      <ModuleQuickDateFilter
        field={dateRangeFilter}
        filters={filters}
        datePresets={datePresets}
        onCommitFilter={(key, value) => commitFilter(key, value)}
      />
    ) : null

  const renderQuickFilters = () => (
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
  )

  return (
    <Form
      colon={false}
      className="module-filter-toolbar"
      aria-label={t('modules.filter.conditions')}
    >
      {segmentedFilters.length ? (
        <div className="module-filter-segmented-row">
          <Space size={32} wrap>
            {segmentedFilters.map((field) => {
              const labelId = buildFormControlId('module-filter', field.key)
              return (
                <div className="module-filter-segmented-group" key={field.key}>
                  <span id={labelId} className="module-filter-segmented-label">
                    {field.label}:
                  </span>
                  <Segmented
                    aria-labelledby={labelId}
                    options={[
                      {
                        label: t('modules.filter.all'),
                        value: SEGMENTED_ALL_VALUE,
                      },
                      ...toSegmentedOptions(
                        resolveFilterOptions(field, filters, projectOptions),
                      ),
                    ]}
                    value={resolveSegmentedFilterValue(filters[field.key])}
                    onChange={(value) =>
                      commitSegmentedFilter(field, String(value))
                    }
                  />
                </div>
              )
            })}
            {renderQuickDateFilters()}
            {quickFilters.length ? (
              <div className="module-filter-quick-group" key="quick-filters">
                {renderQuickFilters()}
              </div>
            ) : null}
          </Space>
        </div>
      ) : null}
      {!segmentedFilters.length && (dateRangeFilter || quickFilters.length) ? (
        <div className="module-filter-quick-row">
          {renderQuickDateFilters()}
          {quickFilters.length ? renderQuickFilters() : null}
        </div>
      ) : null}
      <Row gutter={[16, 16]}>
        {!config.hideKeywordFilter && !hasConfigKeywordFilter ? (
          <Col
            key="keyword"
            xs={24}
            sm={12}
            xl={6}
            className="module-filter-field"
          >
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
                style={{ width: '100%' }}
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
          </Col>
        ) : null}
        {gridFilters.map(renderFilterItem)}
        <Col flex="auto" className="module-filter-actions-col">
          <Form.Item className="module-filter-actions">
            <Button
              className="module-filter-reset-button"
              icon={resolveModuleActionIcon('重置')}
              onClick={onReset}
            >
              {t('common.reset')}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}
