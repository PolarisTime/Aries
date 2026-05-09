import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Input, Table } from 'antd'
import { useEffect, useState } from 'react'
import { searchBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  parentModuleKey: string
  parentDisplayFieldKey?: string
  title?: string
  onSelect: (record: ModuleRecord) => void
  onClose: () => void
}

const parentDisplayFieldFallbackMap: Record<string, string> = {
  'purchase-order': 'orderNo',
  'purchase-inbound': 'inboundNo',
  'sales-order': 'orderNo',
  'sales-outbound': 'outboundNo',
  'freight-bill': 'billNo',
}

export function ModuleParentSelectorOverlay({
  open,
  parentModuleKey,
  parentDisplayFieldKey,
  title = '选择父单据',
  onSelect,
  onClose,
}: Props) {
  const [keyword, setKeyword] = useState('')
  const displayFieldKey =
    parentDisplayFieldKey ||
    parentDisplayFieldFallbackMap[parentModuleKey] ||
    'id'

  useEffect(() => {
    if (!open) {
      setKeyword('')
    }
  }, [open])

  const { data: records, isLoading } = useQuery({
    queryKey: ['parent-selector', parentModuleKey, keyword],
    queryFn: ({ signal }) =>
      searchBusinessModule(parentModuleKey, keyword, 50, { signal }),
    enabled: open && !!parentModuleKey,
  })

  const columns = [
    { dataIndex: displayFieldKey, title: '单据号', width: 160 },
    { dataIndex: 'status', title: '状态', width: 100 },
  ]

  return (
    <WorkspaceOverlay
      title={title}
      open={open}
      onClose={onClose}
      variant="workspace"
      width="min(92vw, 980px)"
      height="min(82vh, 760px)"
      zIndex={1100}
    >
      <div style={{ marginBottom: 16 }}>
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
        onRow={(record) => ({
          onClick: () => {
            onSelect(record)
            onClose()
          },
          style: { cursor: 'pointer' },
        })}
        pagination={{ pageSize: 15 }}
      />
    </WorkspaceOverlay>
  )
}
