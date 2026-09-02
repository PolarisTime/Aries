import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Segmented,
  Select,
  Space,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import { getCustomerProjectOptions } from '@/module-system/core/module-option-resolvers'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleFilterDefinition,
  ModuleFilterOption,
  ModuleFilterOptionEntry,
  ModulePageConfig,
} from '@/types/module-page'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'
import { DISPLAY_DATE_FORMAT } from '@/utils/formatters'
import { padLabel } from '@/utils/label-utils'
import { asString } from '@/utils/type-narrowing'
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

function resolveFilterOptions(
  field: ModuleFilterDefinition,
  filters: SearchParams,
  projectOptions: readonly ProjectOption[],
): ModuleFilterOptionEntry[] {
  const rawOptions =
    typeof field.options === 'function'
      ? field.options === getCustomerProjectOptions
        ? getCustomerProjectOptions(filters, projectOptions)
        : field.options(filters)
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

function ModuleFilterField({
  field,
  filters,
  submittedFilters,
  onUpdateFilter,
  onCommitFilter,
  onCommitTextFilter,
  projectOptions,
}: {
  field: ModuleFilterDefinition
  filters: SearchParams
  submittedFilters: SearchParams
  onUpdateFilter: (key: string, value: unknown) => void
  onCommitFilter: (key: string, value: unknown) => void
  onCommitTextFilter: (key: string, value: string) => void
  projectOptions: readonly ProjectOption[]
}) {
  const { t } = useTranslation()
  const fieldId = buildFormControlId('module-filter', field.key)
  const datePresets = useMemo<
    { label: string; value: [Dayjs, Dayjs] }[]
  >(() => {
    const today = dayjs()
    return [
      {
        label: t('modules.filter.today'),
        value: [today, today],
      },
      {
        label: t('modules.filter.last7Days'),
        value: [today.subtract(6, 'day'), today],
      },
      {
        label: t('modules.filter.last30Days'),
        value: [today.subtract(29, 'day'), today],
      },
      {
        label: t('modules.filter.thisMonth'),
        value: [today.startOf('month'), today.endOf('month')],
      },
    ]
  }, [t])

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
        presets={datePresets}
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
  const gridFilters = sortedFilters.filter(
    (field) => field.type !== 'segmented',
  )
  const quickFilters = config.quickFilters || []
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
            {quickFilters.length ? (
              <div className="module-filter-quick-group" key="quick-filters">
                {renderQuickFilters()}
              </div>
            ) : null}
          </Space>
        </div>
      ) : null}
      {!segmentedFilters.length && quickFilters.length ? (
        <div className="module-filter-quick-row">{renderQuickFilters()}</div>
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
