import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Space from 'antd/es/space'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  keyword: string
  keywordPlaceholder?: string
  keywordWidth?: number
  onKeywordChange: (value: string) => void
  onSearch?: () => void
  onRefresh: () => void
  onCreate?: () => void
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
  children,
}: Props) {
  const { t } = useTranslation()

  return (
    <Space>
      <Input.Search
        placeholder={keywordPlaceholder ?? t('toolbar.searchPlaceholder')}
        /* 动态宽度：keywordWidth 由父组件传入，无法映射为固定 Tailwind 类 */
        style={{ width: keywordWidth }}
        allowClear
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        onSearch={onSearch}
      />
      {children}
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        {t('toolbar.refresh')}
      </Button>
      {onCreate && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          {t('toolbar.create')}
        </Button>
      )}
    </Space>
  )
}
