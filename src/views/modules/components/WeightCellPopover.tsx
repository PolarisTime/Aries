import { useCallback, useState } from 'react'
import Popover from 'antd/es/popover'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { getBusinessModuleDetail } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import { formatWeight } from '@/utils/formatters'

const ITEM_WEIGHT_COLUMNS = [
  { title: '商品编码', dataIndex: 'materialCode', width: 180, ellipsis: true },
  { title: '品牌', dataIndex: 'brand', width: 64, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 72, ellipsis: true },
  { title: '规格', dataIndex: 'spec', width: 72, ellipsis: true },
  { title: '长度', dataIndex: 'length', width: 58, ellipsis: true },
  { title: '件重(吨)', dataIndex: 'pieceWeightTon', width: 88, align: 'center' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-') },
  { title: '数量', dataIndex: 'quantity', width: 64, align: 'center' as const },
  { title: '总重(吨)', dataIndex: 'weightTon', width: 96, align: 'center' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-') },
]

const POPOVER_TABLE_WIDTH = 694

interface Props {
  value: unknown
  record: ModuleRecord
  moduleKey: string
}

export function WeightCellPopover({ value, record, moduleKey }: Props) {
  const [items, setItems] = useState<ModuleRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const handleOpen = useCallback(async () => {
    setOpen(true)
    if (items.length === 0) {
      setLoading(true)
      setError('')
      try {
        const result = await getBusinessModuleDetail(moduleKey, String(record.id))
        const rawItems = result?.data?.items
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          setItems(rawItems)
        } else {
          setError('当前单据无明细数据')
        }
      } catch {
        setError('加载明细失败')
      } finally {
        setLoading(false)
      }
    }
  }, [items.length, moduleKey, record.id])

  const emptyText = error || '暂无数据'

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title="每件重量明细"
      destroyTooltipOnHide
      content={
        <div style={{ width: POPOVER_TABLE_WIDTH }}>
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            pagination={false}
            dataSource={items}
            columns={ITEM_WEIGHT_COLUMNS}
            locale={{ emptyText }}
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
