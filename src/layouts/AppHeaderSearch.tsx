import { SearchOutlined } from '@ant-design/icons'
import type { AutoCompleteProps } from 'antd/es/auto-complete'
import AutoComplete from 'antd/es/auto-complete'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import { buildFormControlId } from '@/utils/form-control-id'

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
  const searchInputId = buildFormControlId('header-search', 'keyword')

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
          onChange={(value) => {
            const nextValue = String(value)
            const isOptionValue = options.some(
              (option) => String(option.value) === nextValue,
            )
            if (!isOptionValue) {
              onKeywordChange(nextValue)
            }
          }}
          onSelect={(value) => {
            const selectedValue = String(value)
            onSelect(selectedValue)
          }}
          onOpenChange={onOpenChange}
        >
          <Input
            id={searchInputId}
            name="header-search-keyword"
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
