import { Input, Button } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ModulePageConfig } from '@/types/module-page'

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
  const visibleFilters = config.filters.slice(0, expanded ? undefined : (config.defaultVisibleFilterCount || 3))

  return (
    <div className="flex flex-wrap items-center gap-x-[var(--app-filter-gap-x)] gap-y-2 pb-[var(--app-filter-margin-bottom)] mb-[var(--app-filter-margin-bottom)] border-b border-[#e8e8e8]">
      <div className="module-filter-item">
        <Input.Search
          placeholder="搜索关键词..."
          allowClear
          onSearch={onSearch}
          style={{ width: 240 }}
          prefix={<SearchOutlined />}
        />
      </div>
      {visibleFilters.map((field) => (
        <div key={field.key} className="module-filter-item flex items-center gap-2">
          <span className="whitespace-nowrap text-right text-[var(--app-font-size)] text-[#595959]" style={{ width: 'var(--app-filter-label-width)' }}>
            {field.label}
          </span>
          <Input
            placeholder={field.placeholder || `请输入${field.label}`}
            value={String(filters[field.key] || '')}
            onChange={(e) => onUpdateFilter(field.key, e.target.value)}
            onPressEnter={onSearch}
            style={{ width: 'var(--app-filter-control-width)' }}
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button type="primary" onClick={onSearch} icon={<SearchOutlined />}>查询</Button>
        <Button onClick={onReset}>重置</Button>
        {config.filters.length > (config.defaultVisibleFilterCount || 3) && (
          <Button type="link" onClick={onToggleExpand}>
            {expanded ? '收起' : '展开'}
          </Button>
        )}
      </div>
    </div>
  )
}
