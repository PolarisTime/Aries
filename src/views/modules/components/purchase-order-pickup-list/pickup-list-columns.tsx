import type { TableColumnsType } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatWeight } from '@/utils/formatters'
import type { PickupListRow } from './pickup-list-draft'

function displayText(value: string | null | undefined) {
  const text = value?.trim()
  return text || '-'
}

/**
 * 提货明细列定义：以行实例（PickupListRow）为行模型，
 * 商品与仓库字段取自 row.item，数量与重量取拆分后的行值。
 *
 * 不再包含拖动列：排序改为整行拖动(鼠标按住拖动 / 触摸长按 / 键盘空格),
 * 顺序微调另有右键菜单的「上移/下移」。见 pickup-list-sortable.tsx。
 */
export function usePickupListColumns() {
  const { t } = useTranslation()

  return useMemo<TableColumnsType<PickupListRow>>(
    () => [
      {
        title: t('modules.columns.warehouseName'),
        key: 'warehouseName',
        width: 112,
        align: 'center',
        render: (_value, row) => displayText(row.item.warehouseName),
      },
      {
        title: t('modules.columns.brand'),
        key: 'brand',
        width: 80,
        align: 'center',
        ellipsis: true,
        render: (_value, row) => row.item.brand,
      },
      {
        title: t('modules.purchasePickupList.itemName'),
        key: 'category',
        width: 80,
        align: 'center',
        ellipsis: true,
        render: (_value, row) => row.item.category,
      },
      {
        title: t('modules.columns.material'),
        key: 'material',
        width: 80,
        align: 'center',
        ellipsis: true,
        render: (_value, row) => row.item.material,
      },
      {
        title: t('modules.columns.spec'),
        key: 'spec',
        width: 96,
        align: 'center',
        ellipsis: true,
        render: (_value, row) => row.item.spec,
      },
      {
        title: t('modules.columns.length'),
        key: 'length',
        width: 64,
        align: 'center',
        render: (_value, row) => displayText(row.item.length),
      },
      {
        title: t('modules.purchasePickupList.pickupQuantity'),
        key: 'quantity',
        dataIndex: 'quantity',
        width: 132,
        align: 'center',
      },
      {
        title: t('modules.purchasePickupList.pieceWeight'),
        key: 'pieceWeightTon',
        width: 96,
        align: 'center',
        render: (_value, row) => formatWeight(row.item.pieceWeightTon),
      },
      {
        title: t('modules.purchasePickupList.pickupWeight'),
        key: 'weightTon',
        dataIndex: 'weightTon',
        width: 96,
        align: 'center',
        render: (value: number) => formatWeight(value),
      },
    ],
    [t],
  )
}
