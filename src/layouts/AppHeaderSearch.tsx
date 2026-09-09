import { SearchOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import { AutoComplete, Button, Input } from 'antd'
import type { AutoCompleteProps } from 'antd/es/auto-complete'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const searchInputId = buildFormControlId('header-search', 'keyword')
  const inputRef = useRef<InputRef | null>(null)

  const restoreSearchInputFocus = () => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
    })
  }

  const handleSelect = (value: string) => {
    onSelect(String(value))
    restoreSearchInputFocus()
  }

  const handleSubmit = (value: string) => {
    void onSubmit(value)
    restoreSearchInputFocus()
  }

  return (
    <div className={className}>
      <div
        className={
          loading
            ? 'header-global-search-group is-loading'
            : 'header-global-search-group'
        }
      >
        <AutoComplete
          className="header-global-search-box"
          value={keyword}
          options={options}
          open={open && options.length > 0}
          showSearch={{
            onSearch: (value) => {
              onOpen()
              void onSearch(value)
            },
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
          onSelect={handleSelect}
          onOpenChange={onOpenChange}
        >
          <Input
            ref={inputRef}
            id={searchInputId}
            name="header-search-keyword"
            aria-label={t('layouts.headerSearch.placeholder')}
            className="header-global-search-input"
            placeholder={t('layouts.headerSearch.placeholder')}
            onFocus={onOpen}
            onBlur={onBlur}
            onPressEnter={(event) => handleSubmit(event.currentTarget.value)}
          />
        </AutoComplete>
        <Button
          type="primary"
          className="header-global-search-button"
          loading={loading}
          icon={<SearchOutlined />}
          onClick={() => handleSubmit(keyword)}
        />
      </div>
    </div>
  )
}
