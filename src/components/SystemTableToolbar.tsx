import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Input } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { buildFormControlId } from '@/utils/form-control-id'

interface Props {
  keyword: string
  keywordPlaceholder?: string
  keywordWidth?: number
  onKeywordChange: (value: string) => void
  onSearch?: () => void
  onRefresh: () => void
  onCreate?: () => void
  refreshLabel?: string
  createLabel?: string
  createDisabled?: boolean
  searchId?: string
  searchName?: string
  children?: ReactNode
}

export function SystemTableToolbar({
  keyword,
  keywordPlaceholder,
  keywordWidth = 320,
  onKeywordChange,
  onSearch,
  onRefresh,
  onCreate,
  refreshLabel,
  createLabel,
  createDisabled = false,
  searchId,
  searchName,
  children,
}: Props) {
  const { t } = useTranslation()
  const inputId =
    searchId ?? buildFormControlId('system-table-toolbar', 'search')
  const inputName = searchName ?? inputId

  return (
    <div className="system-table-toolbar">
      <Input.Search
        id={inputId}
        name={inputName}
        className="system-table-toolbar-search"
        placeholder={keywordPlaceholder ?? t('toolbar.searchPlaceholder')}
        /* 动态宽度：keywordWidth 由父组件传入，无法映射为固定 Tailwind 类 */
        style={{ width: keywordWidth, maxWidth: '100%' }}
        allowClear
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        onSearch={onSearch}
      />
      {children}
      <Button
        className="system-table-toolbar-action"
        icon={<ReloadOutlined />}
        onClick={onRefresh}
      >
        {refreshLabel ?? t('toolbar.refresh')}
      </Button>
      {onCreate && (
        <Button
          className="system-table-toolbar-action"
          type="primary"
          icon={<PlusOutlined />}
          disabled={createDisabled}
          onClick={onCreate}
        >
          {createLabel ?? t('toolbar.create')}
        </Button>
      )}
    </div>
  )
}
