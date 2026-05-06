import { useState } from 'react'
import { Drawer, Input, Table } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { searchBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  open: boolean
  parentModuleKey: string
  title?: string
  onSelect: (record: ModuleRecord) => void
  onClose: () => void
}

export function ModuleParentSelectorOverlay({ open, parentModuleKey, title = '选择父单据', onSelect, onClose }: Props) {
  const [keyword, setKeyword] = useState('')

  const { data: records, isLoading } = useQuery({
    queryKey: ['parent-selector', parentModuleKey, keyword],
    queryFn: () => searchBusinessModule(parentModuleKey, keyword, 50),
    enabled: open && !!parentModuleKey,
  })

  const columns = [
    { dataIndex: 'id', title: '单据号', width: 160 },
    { dataIndex: 'status', title: '状态', width: 100 },
  ]

  return (
    <Drawer title={title} open={open} onClose={onClose} size={680} destroyOnHidden>
      <div className="mb-3">
        <Input.Search
          placeholder="搜索单据号..."
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
        pagination={{ pageSize: 15, size: 'small' }}
      />
    </Drawer>
  )
}
