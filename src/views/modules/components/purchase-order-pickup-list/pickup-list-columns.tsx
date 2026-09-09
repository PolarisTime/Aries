import type { TableColumnsType } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import { formatWeight } from '@/utils/formatters'
import { DragHandle } from './pickup-list-sortable'

function displayText(value: string | null | undefined) {
  const text = value?.trim()
  return text || '-'
}

export function usePickupListColumns() {
  const { t } = useTranslation()

  return useMemo<TableColumnsType<PurchaseOrderPickupListItem>>(
    () => [
      {
        key: 'drag',
        width: 48,
        align: 'center',
        render: (_value, _record, index) => (
          <DragHandle
            label={t('modules.purchasePickupList.dragRow', {
              index: index + 1,
            })}
          />
        ),
      },
      {
        title: t('modules.columns.warehouseName'),
        dataIndex: 'warehouseName',
        width: 112,
        align: 'center',
        render: (value: string | null) => displayText(value),
      },
      {
        title: t('modules.columns.brand'),
        dataIndex: 'brand',
        width: 80,
        align: 'center',
        ellipsis: true,
      },
      {
        title: t('modules.purchasePickupList.itemName'),
        dataIndex: 'category',
        width: 80,
        align: 'center',
        ellipsis: true,
      },
      {
        title: t('modules.columns.material'),
        dataIndex: 'material',
        width: 80,
        align: 'center',
        ellipsis: true,
      },
      {
        title: t('modules.columns.spec'),
        dataIndex: 'spec',
        width: 96,
        align: 'center',
        ellipsis: true,
      },
      {
        title: t('modules.columns.length'),
        dataIndex: 'length',
        width: 64,
        align: 'center',
        render: (value: string | null) => displayText(value),
      },
      {
        title: t('modules.purchasePickupList.pickupQuantity'),
        dataIndex: 'pickupQuantity',
        width: 72,
        align: 'center',
      },
      {
        title: t('modules.purchasePickupList.pieceWeight'),
        dataIndex: 'pieceWeightTon',
        width: 96,
        align: 'center',
        render: (value: number) => formatWeight(value),
      },
      {
        title: t('modules.purchasePickupList.pickupWeight'),
        dataIndex: 'pickupWeightTon',
        width: 96,
        align: 'center',
        render: (value: number) => formatWeight(value),
      },
    ],
    [t],
  )
}
