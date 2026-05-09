import { Button, Col, DatePicker, Form, Input, Row, Select, Space } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type {
  ModuleFilterDefinition,
  ModuleFilterOption,
  ModuleFilterOptionEntry,
  ModuleFilterOptionGroup,
  ModulePageConfig,
} from '@/types/module-page'
import { padLabel } from '@/utils/label-utils'
import { resolveModuleActionIcon } from '@/views/modules/module-action-icons'

interface Props {
  config: ModulePageConfig
  filters: Record<string, unknown>
  onUpdateFilter: (key: string, value: unknown) => void
  onSearch: () => void
  onReset: () => void
}

export function ModuleFilterToolbar({
  config,
  filters,
  onUpdateFilter,
  onSearch,
  onReset,
}: Props) {
  const hasConfigKeywordFilter = config.filters.some(
    (field) => field.key === 'keyword',
  )
  const visibleFilters = [...config.filters].sort(
    (left, right) => (left.row || 1) - (right.row || 1),
  )

  const resolveOptions = (field: ModuleFilterDefinition) => {
    const rawOptions =
      typeof field.options === 'function'
        ? field.options(filters)
        : field.options || []

    return rawOptions.map((option: ModuleFilterOptionEntry) => {
      if ('options' in option) {
        const group = option as ModuleFilterOptionGroup
        return {
          label: group.label,
          options: group.options.map((item: ModuleFilterOption) => ({
            label: item.label,
            value: item.value,
          })),
        }
      }

      const entry = option as ModuleFilterOption
      return {
        label: entry.label,
        value: entry.value,
      }
    })
  }

  const renderFilterField = (field: ModuleFilterDefinition) => {
    if (field.type === 'select') {
      return (
        <Select
          allowClear
          placeholder={field.placeholder || `请选择${field.label}`}
          value={
            typeof filters[field.key] === 'string'
              ? (filters[field.key] as string)
              : undefined
          }
          onChange={(value) => onUpdateFilter(field.key, value)}
          options={resolveOptions(field)}
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
          value={rangeValue}
          style={{ width: '100%' }}
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
        allowClear
        placeholder={field.placeholder || `请输入${field.label}`}
        value={String(filters[field.key] || '')}
        onChange={(event) => onUpdateFilter(field.key, event.target.value)}
        onPressEnter={onSearch}
      />
    )
  }

  return (
    <Form onFinish={onSearch} colon={false} style={{ marginBottom: 16 }}>
      <Row gutter={[16, 8]}>
        {!hasConfigKeywordFilter ? (
          <Col xs={24} sm={12} lg={8} xl={6}>
            <Form.Item
              label={padLabel('关键字')}
              className="module-filter-item"
            >
              <Input
                allowClear
                placeholder="搜索关键词..."
                value={String(filters.keyword || '')}
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
              label={padLabel(field.label)}
              className="module-filter-item"
            >
              {renderFilterField(field)}
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
                查询
              </Button>
              <Button icon={resolveModuleActionIcon('重置')} onClick={onReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}
