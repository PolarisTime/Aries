import { ApartmentOutlined, SearchOutlined } from '@ant-design/icons'
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
  /** 打开该搜索结果的单据流向弹窗；未提供时不展示流向入口。 */
  onOpenFlow?: (value: string) => void
}

/** 支持单据流向查询的模块（与后端 DocumentFlowService 识别的单据类型一致）。 */
const FLOW_MODULE_KEYS: ReadonlySet<string> = new Set([
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'sales-return',
  'freight-bill',
])

function moduleKeyOfOption(value: unknown): string {
  return String(value ?? '').split('::')[0]
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
  onOpenFlow,
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
          optionRender={(option) => (
            <div className="header-global-search-option">
              <span className="header-global-search-option-label">
                {option.data.label}
              </span>
              {onOpenFlow &&
              FLOW_MODULE_KEYS.has(moduleKeyOfOption(option.value)) ? (
                <Button
                  type="text"
                  size="small"
                  className="header-global-search-flow-button"
                  icon={<ApartmentOutlined />}
                  title={t('layouts.headerSearch.viewFlow')}
                  aria-label={t('layouts.headerSearch.viewFlow')}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onOpenFlow(String(option.value))
                  }}
                />
              ) : null}
            </div>
          )}
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
