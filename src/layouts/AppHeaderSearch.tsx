import { SearchOutlined } from '@ant-design/icons'
import type { AutoCompleteProps } from 'antd'
import { AutoComplete, Button, Input } from 'antd'

export interface AppHeaderSearchProps {
  className: string
  keyword: string
  options: NonNullable<AutoCompleteProps['options']>
  open: boolean
  loading: boolean
  onBlur: () => void
  onKeywordChange: (value: string) => void
  onOpen: () => void
  onOpenChange: (open: boolean) => void
  onSearch: (value: string) => void | Promise<void>
  onSelect: (value: string) => void
  onSubmit: (value: string) => void | Promise<void>
}

export function AppHeaderSearch({
  className,
  keyword,
  options,
  open,
  loading,
  onBlur,
  onKeywordChange,
  onOpen,
  onOpenChange,
  onSearch,
  onSelect,
  onSubmit,
}: AppHeaderSearchProps) {
  return (
    <div className={className}>
      <div className="header-global-search-group">
        <AutoComplete
          className="header-global-search-box"
          value={keyword}
          options={options}
          open={open && options.length > 0}
          onSearch={(value) => {
            onOpen()
            void onSearch(value)
          }}
          onChange={(value) => onKeywordChange(String(value))}
          onSelect={(value) => onSelect(String(value))}
          onOpenChange={onOpenChange}
        >
          <Input
            aria-label="搜索单号、合同号、对账单号"
            className="header-global-search-input"
            placeholder="搜索单号、合同号、对账单号"
            onFocus={onOpen}
            onBlur={onBlur}
            onPressEnter={(event) => void onSubmit(event.currentTarget.value)}
          />
        </AutoComplete>
        <Button
          type="primary"
          className="header-global-search-button"
          loading={loading}
          icon={<SearchOutlined />}
          onClick={() => void onSubmit(keyword)}
        />
      </div>
    </div>
  )
}
