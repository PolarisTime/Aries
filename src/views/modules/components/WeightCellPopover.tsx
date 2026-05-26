import { useCallback, useState } from 'react'
import Popover from 'antd/es/popover'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { getBusinessModuleDetail } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import { formatWeight } from '@/utils/formatters'

const ITEM_WEIGHT_COLUMNS = [
  { title: '商品编码', dataIndex: 'materialCode', width: 160, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 72, ellipsis: true },
  { title: '规格', dataIndex: 'spec', width: 72, ellipsis: true },
  { title: '长度', dataIndex: 'length', width: 64, ellipsis: true },
  { title: '件重(吨)', dataIndex: 'pieceWeightTon', align: 'center' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-') },
  { title: '数量', dataIndex: 'quantity', align: 'center' as const },
  { title: '总重(吨)', dataIndex: 'weightTon', align: 'center' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-') },
]

interface Props {
  value: unknown
  record: ModuleRecord
  moduleKey: string
}

export function WeightCellPopover({ value, record, moduleKey }: Props) {
  const [items, setItems] = useState<ModuleRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(async () => {
    setOpen(true)
    if (items.length === 0) {
      setLoading(true)
      try {
        const result = await getBusinessModuleDetail(moduleKey, String(record.id))
        setItems(Array.isArray(result.data?.items) ? result.data.items : [])
      } finally {
        setLoading(false)
      }
    }
  }, [items.length, moduleKey, record.id])

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title="每件重量明细"
      destroyTooltipOnHide
      content={
        <div style={{ minWidth: 520, maxWidth: 600 }}>
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            pagination={false}
            dataSource={items}
            columns={ITEM_WEIGHT_COLUMNS}
            scroll={{ x: 520 }}
          />
        </div>
      }
    >
      <Typography.Link>
        {value != null ? formatWeight(value) : '-'}
      </Typography.Link>
    </Popover>
  )
}
