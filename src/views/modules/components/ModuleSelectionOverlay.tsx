import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import Input from 'antd/es/input'
import Table from 'antd/es/table'
import { useEffect, useState } from 'react'
import { searchBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  moduleKey: string
  title?: string
  onSelect: (record: ModuleRecord) => void
  onClose: () => void
}

export function ModuleSelectionOverlay({
  open,
  moduleKey,
  title = '选择记录',
  onSelect,
  onClose,
}: Props) {
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (!open) {
      setKeyword('')
    }
  }, [open])

  const { data: records, isLoading } = useQuery({
    queryKey: ['module-selection', moduleKey, keyword],
    queryFn: ({ signal }) =>
      searchBusinessModule(moduleKey, keyword, 100, { signal }),
    enabled: open && !!moduleKey,
  })

  const columns = [
    { dataIndex: 'id', title: 'ID', width: 80 },
    { dataIndex: 'title', title: '名称', ellipsis: true },
  ]

  return (
    <WorkspaceOverlay
      title={title}
      open={open}
      onClose={onClose}
      variant="workspace"
      width="min(92vw, 960px)"
      height="min(82vh, 760px)"
      zIndex={1100}
    >
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={(v) => setKeyword(v)}
          prefix={<SearchOutlined />}
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={isLoading}
        onRow={(record) => ({
          onClick: () => {
            onSelect(record)
            onClose()
          },
          style: { cursor: 'pointer' },
        })}
        pagination={{ pageSize: 20 }}
      />
    </WorkspaceOverlay>
  )
}
