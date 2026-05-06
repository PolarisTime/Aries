import { Button, Col, DatePicker, Form, Input, Row, Select, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type {
  ModuleFilterDefinition,
  ModuleFilterOption,
  ModuleFilterOptionEntry,
  ModuleFilterOptionGroup,
  ModulePageConfig,
} from '@/types/module-page'

interface Props {
  config: ModulePageConfig
  filters: Record<string, unknown>
  expanded: boolean
  onUpdateFilter: (key: string, value: unknown) => void
  onSearch: () => void
  onReset: () => void
  onToggleExpand: () => void
}

export function ModuleFilterToolbar({
  config, filters, expanded,
  onUpdateFilter, onSearch, onReset, onToggleExpand,
}: Props) {
  const visibleFilters = [...config.filters]
    .sort((left, right) => (left.row || 1) - (right.row || 1))
    .slice(0, expanded ? undefined : (config.defaultVisibleFilterCount || 3))

  const resolveOptions = (field: ModuleFilterDefinition) => {
    const rawOptions = typeof field.options === 'function'
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
          value={typeof filters[field.key] === 'string' ? filters[field.key] as string : undefined}
          onChange={(value) => onUpdateFilter(field.key, value)}
          options={resolveOptions(field)}
        />
      )
    }

    if (field.type === 'dateRange') {
      const value = filters[field.key]
      const rangeValue = Array.isArray(value) && value.length === 2
        ? [dayjs(String(value[0])), dayjs(String(value[1]))] as [Dayjs, Dayjs]
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
    <Form
      layout="vertical"
      onFinish={onSearch}
      style={{ marginBottom: 16 }}
    >
      <Row gutter={[16, 0]}>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Form.Item label="关键字">
            <Input
              allowClear
              placeholder="搜索关键词..."
              prefix={<SearchOutlined />}
              value={String(filters.keyword || '')}
              onChange={(event) => onUpdateFilter('keyword', event.target.value)}
              onPressEnter={onSearch}
            />
          </Form.Item>
        </Col>
        {visibleFilters.map((field) => (
          <Col key={field.key} xs={24} sm={12} lg={8} xl={6}>
            <Form.Item label={field.label}>
              {renderFilterField(field)}
            </Form.Item>
          </Col>
        ))}
        <Col xs={24}>
          <Form.Item>
            <Space wrap>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button onClick={onReset}>重置</Button>
              {config.filters.length > (config.defaultVisibleFilterCount || 3) && (
                <Button type="link" onClick={onToggleExpand}>
                  {expanded ? '收起' : '展开'}
                </Button>
              )}
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}
