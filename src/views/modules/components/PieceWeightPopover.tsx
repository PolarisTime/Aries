import { useQuery } from '@tanstack/react-query'
import Popover from 'antd/es/popover'
import Table from 'antd/es/table'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { assertApiSuccess, http } from '@/api/client'
import { MATERIAL_TYPE } from '@/constants/status-constants'

interface PieceWeight {
  pieceNo: number
  weightTon: number
  salesOrderNo: string
}

interface Props {
  itemId: string | number
  weightTon: string | number
  category?: string
  inboundItemId?: string | number
  purchaseOrderItemId?: string | number
  salesOrderItemId?: string | number
}

function normalizeLookupId(value: string | number | undefined) {
  return typeof value === 'number' || typeof value === 'string'
    ? String(value).trim()
    : ''
}

export function PieceWeightPopover({
  itemId,
  weightTon,
  category,
  inboundItemId,
  purchaseOrderItemId,
  salesOrderItemId,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const normalizedSalesOrderItemId = normalizeLookupId(salesOrderItemId)
  const normalizedInboundItemId = normalizeLookupId(inboundItemId)
  const normalizedPurchaseOrderItemId =
    normalizeLookupId(purchaseOrderItemId) || normalizeLookupId(itemId)
  const hasSalesOrderItemLookup = Boolean(normalizedSalesOrderItemId)
  const hasInboundItemLookup = Boolean(normalizedInboundItemId)

  const apiPath = hasSalesOrderItemLookup
    ? `/purchase-orders/items/piece-weights/by-sales-order-item?salesOrderItemId=${encodeURIComponent(normalizedSalesOrderItemId)}`
    : hasInboundItemLookup
      ? `/purchase-inbounds/items/${encodeURIComponent(normalizedInboundItemId)}/piece-weights`
      : `/purchase-orders/items/${encodeURIComponent(normalizedPurchaseOrderItemId)}/piece-weights`

  const queryKey = hasSalesOrderItemLookup
    ? ['piece-weights', 'sales-order-item', normalizedSalesOrderItemId]
    : hasInboundItemLookup
      ? ['piece-weights', 'purchase-inbound-item', normalizedInboundItemId]
      : ['piece-weights', 'purchase-order-item', normalizedPurchaseOrderItemId]

  const {
    data = [],
    isError,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await http.get<{ code: number; data: PieceWeight[] }>(apiPath)
      assertApiSuccess(r, t('modules.pieceWeight.loadFailed'))
      return r.data || []
    },
    enabled:
      open &&
      (hasSalesOrderItemLookup ||
        hasInboundItemLookup ||
        Boolean(normalizedPurchaseOrderItemId)),
  })

  const isWeighCategory =
    category === MATERIAL_TYPE.COIL_REBAR || category === MATERIAL_TYPE.WIRE_ROD

  if (!isWeighCategory) {
    return (
      <span>
        {typeof weightTon === 'number' ? weightTon.toFixed(3) : weightTon}
      </span>
    )
  }

  const total = data.reduce((sum, p) => sum + Number(p.weightTon), 0)

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title={
        data.length > 0
          ? t('modules.pieceWeight.detailTitle', {
              count: data.length,
              weight: total.toFixed(3),
            })
          : t('modules.pieceWeight.detailTitleFallback')
      }
      overlayStyle={{ maxWidth: 260 }}
      content={
        isFetching ? (
          <div className="py-8 text-center">
            {t('modules.pieceWeight.loading')}
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-gray-400">
            {t('modules.pieceWeight.loadFailed')}
          </div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            {t('modules.pieceWeight.noData')}
          </div>
        ) : (
          <Table
            rowKey="pieceNo"
            dataSource={data}
            size="small"
            pagination={false}
            columns={[
              {
                title: '#',
                dataIndex: 'pieceNo',
                width: 40,
                align: 'center' as const,
              },
              {
                title: t('modules.pieceWeight.ton'),
                dataIndex: 'weightTon',
                width: 70,
                align: 'right' as const,
                render: (v: number) => v.toFixed(3),
              },
              {
                title: t('modules.pieceWeight.relatedOrderNo'),
                dataIndex: 'salesOrderNo',
                width: 140,
                ellipsis: true,
              },
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
