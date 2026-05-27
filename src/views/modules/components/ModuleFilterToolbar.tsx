import Button from 'antd/es/button'
import Col from 'antd/es/col'
import DatePicker from 'antd/es/date-picker'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
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
import { resolveModuleActionIcon } from '@/module-system/module-action-icons'

interface Props {
  config: ModulePageConfig
  filters: SearchParams
  onUpdateFilter: (key: string, value: unknown) => void
  onSearch: () => void
  onReset: () => void
}

function ModuleFilterField({
  field,
  filters,
  onUpdateFilter,
  onSearch,
}: {
  field: ModuleFilterDefinition
  filters: SearchParams
  onUpdateFilter: (key: string, value: unknown) => void
  onSearch: () => void
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
        placeholder={field.placeholder || t('modules.filter.selectPlaceholder', { label: field.label })}
        value={
          typeof filters[field.key] === 'string'
            ? asString(filters[field.key])
            : undefined
        }
        onChange={(value) => onUpdateFilter(field.key, value)}
        options={resolveOptions()}
      />
    )
  }

  if (field.type === 'dateRange') {
    const value = filters[field.key]
    const rangeValue =
      Array.isArray(value) && value.length === 2
        ? ([dayjs(String(value[0])), dayjs(String(value[1]))] as [
            Dayjs,
            Dayjs,
          ])
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
        onChange={(_, dateStrings) =>
          onUpdateFilter(
            field.key,
            dateStrings[0] && dateStrings[1] ? dateStrings : undefined,
          )
        }
      />
    )
  }

  return (
    <Input
      id={fieldId}
      name={field.key}
      allowClear
      placeholder={field.placeholder || t('modules.filter.inputPlaceholder', { label: field.label })}
      value={asString(filters[field.key])}
      onChange={(event) => onUpdateFilter(field.key, event.target.value)}
      onPressEnter={onSearch}
    />
  )
}

export function ModuleFilterToolbar({
  config,
  filters,
  onUpdateFilter,
  onSearch,
  onReset,
}: Props) {
  const { t } = useTranslation()

  const getFilterFieldLabelTargetId = (field: ModuleFilterDefinition) => {
    const fieldId = buildFormControlId('module-filter', field.key)
    return field.type === 'dateRange' ? `${fieldId}-start` : fieldId
  }

  const hasConfigKeywordFilter = config.filters.some(
    (field) => field.key === 'keyword',
  )
  const visibleFilters = config.filters.toSorted(
    (left, right) => (left.row || 1) - (right.row || 1),
  )

  return (
    <Form onFinish={onSearch} colon={false} className="mb-4">
      <Row gutter={[16, 8]}>
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
                onPressEnter={onSearch}
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
                onUpdateFilter={onUpdateFilter}
                onSearch={onSearch}
              />
            </Form.Item>
          </Col>
        ))}
        <Col xs={24}>
          <Form.Item>
            <Space wrap>
              <Button
                type="primary"
                htmlType="submit"
                icon={resolveModuleActionIcon('查询')}
              >
                {t('common.query')}
              </Button>
              <Button icon={resolveModuleActionIcon('重置')} onClick={onReset}>
                {t('common.reset')}
              </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}
