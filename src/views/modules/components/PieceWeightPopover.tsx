import { useQuery } from '@tanstack/react-query'
import Popover from 'antd/es/popover'
import Table from 'antd/es/table'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  sourceSalesOrderItemId?: string | number
}

export function PieceWeightPopover({ itemId, weightTon, category, sourceSalesOrderItemId }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const apiPath = sourceSalesOrderItemId
    ? `/purchase-orders/items/piece-weights/by-sales-order-item?salesOrderItemId=${sourceSalesOrderItemId}`
    : `/purchase-orders/items/${itemId}/piece-weights`

  const queryKey = sourceSalesOrderItemId
    ? ['piece-weights', 'sales-order-item', sourceSalesOrderItemId]
    : ['piece-weights', itemId]

  const { data = [], isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await http.get<{ code: number; data: PieceWeight[] }>(apiPath)
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
      title={data.length > 0 ? t('modules.pieceWeight.detailTitle', { count: data.length, weight: total.toFixed(3) }) : t('modules.pieceWeight.detailTitleFallback')}
      overlayStyle={{ maxWidth: 260 }}
      content={
        isFetching ? (
          <div className="py-8 text-center">{t('modules.pieceWeight.loading')}</div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-gray-400">{t('modules.pieceWeight.noData')}</div>
        ) : (
          <Table
            rowKey="pieceNo"
            dataSource={data}
            size="small"
            pagination={false}
            columns={[
              { title: '#', dataIndex: 'pieceNo', width: 40, align: 'center' as const },
              {
                title: t('modules.pieceWeight.ton'),
                dataIndex: 'weightTon',
                width: 70,
                align: 'right' as const,
                render: (v: number) => v.toFixed(3),
              },
              { title: t('modules.pieceWeight.relatedOrderNo'), dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
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
