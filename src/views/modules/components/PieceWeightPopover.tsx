import { useQuery } from '@tanstack/react-query'
import Popover from 'antd/es/popover'
import Table from 'antd/es/table'
import { useState } from 'react'
import { assertApiSuccess, http } from '@/api/client'

interface PieceWeight {
  pieceNo: number
  weightTon: number
  salesOrderNo: string
}

interface Props {
  itemId: string | number
  weightTon: string | number
  category?: string
}

export function PieceWeightPopover({ itemId, weightTon, category }: Props) {
  const [open, setOpen] = useState(false)

  const { data = [], isFetching } = useQuery({
    queryKey: ['piece-weights', itemId],
    queryFn: async () => {
      const r = await http.get<{ code: number; data: PieceWeight[] }>(
        `/purchase-orders/items/${itemId}/piece-weights`,
      )
      assertApiSuccess(r, '加载逐件重量失败')
      return r.data || []
    },
    enabled: open,
  })

  const isWeighCategory = category === '盘螺' || category === '线材'

  if (!isWeighCategory) {
    return <span>{typeof weightTon === 'number' ? weightTon.toFixed(3) : weightTon}</span>
  }

  const total = data.reduce((sum, p) => sum + Number(p.weightTon), 0)

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title={data.length > 0 ? `逐件重量明细（共 ${data.length} 件 / ${total.toFixed(3)} 吨）` : '逐件重量明细'}
      content={
        isFetching ? (
          <div className="py-16 text-center text-gray-400">加载中...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-gray-400">暂无逐件数据</div>
        ) : (
          <Table
            rowKey="pieceNo"
            dataSource={data}
            size="small"
            pagination={false}
            columns={[
              { title: '件号', dataIndex: 'pieceNo', width: 60, align: 'center' as const },
              {
                title: '重量(吨)',
                dataIndex: 'weightTon',
                width: 90,
                align: 'right' as const,
                render: (v: number) => v.toFixed(3),
              },
              { title: '关联销售订单', dataIndex: 'salesOrderNo', width: 180, ellipsis: true },
            ]}
          />
        )
      }
    >
      <span className="cursor-pointer text-blue-600 underline decoration-dashed underline-offset-2">
        {typeof weightTon === 'number' ? weightTon.toFixed(3) : weightTon}
      </span>
    </Popover>
  )
}
