import { useState } from 'react'
import { Drawer, Input, Table } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { searchBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  open: boolean
  moduleKey: string
  title?: string
  onSelect: (record: ModuleRecord) => void
  onClose: () => void
}

export function ModuleSelectionOverlay({ open, moduleKey, title = '选择记录', onSelect, onClose }: Props) {
  const [keyword, setKeyword] = useState('')

  const { data: records, isLoading } = useQuery({
    queryKey: ['module-selection', moduleKey, keyword],
    queryFn: () => searchBusinessModule(moduleKey, keyword, 100),
    enabled: open && !!moduleKey,
  })

  const columns = [
    { dataIndex: 'id', title: 'ID', width: 80 },
    { dataIndex: 'title', title: '名称', ellipsis: true },
  ]

  return (
    <Drawer title={title} open={open} onClose={onClose} size={640} destroyOnHidden>
      <div className="mb-3">
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
        size="small"
        onRow={(record) => ({
          onClick: () => { onSelect(record); onClose() },
          style: { cursor: 'pointer' },
        })}
        pagination={{ pageSize: 20, size: 'small' }}
      />
    </Drawer>
  )
}
