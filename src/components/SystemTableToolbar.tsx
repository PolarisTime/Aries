import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Space from 'antd/es/space'
import type { ReactNode } from 'react'

type Props = {
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
  keywordPlaceholder = '搜索...',
  keywordWidth = 320,
  onKeywordChange,
  onSearch,
  onRefresh,
  onCreate,
  children,
}: Props) {
  return (
    <Space>
      <Input.Search
        placeholder={keywordPlaceholder}
        style={{ width: keywordWidth }}
        allowClear
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        onSearch={onSearch}
      />
      {children}
      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        刷新
      </Button>
      {onCreate && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          新建
        </Button>
      )}
    </Space>
  )
}
