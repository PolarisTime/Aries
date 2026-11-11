import type { TableColumnsType } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TRADE_LINE_ITEM_FIELD_CATALOG,
  type TradeLineItemFieldKey,
} from '@/config/business-pages/shared/trade-line-item-field-catalog'
import { formatWeight } from '@/utils/formatters'
import { shouldEllipsizeColumn } from '@/utils/table-column-ellipsis'
import type { PickupListRow } from './pickup-list-draft'

function displayText(value: string | null | undefined) {
  const text = value?.trim()
  return text || '-'
}

/**
 * 「放不下要不要省略」不在这里判断：品牌/类别/材质/规格/长度/数量/件重/重量在明细
 * 字段目录里是**短值**（显式 `ellipsis: false`），截断后「HRB400E」读不出材质、
 * 「1234.567」比不了大小；仓库名称等长文本列保持省略，全文由 antd 写进 `title`。
 * 判定只走 `shouldEllipsizeColumn`（唯一判定处）+ 目录（唯一声明处），
 * 与明细表、列表主表、父单据选择共用同一份口径，不在本文件手写 `ellipsis: true`。
 */
function pickupColumnEllipsis(key: TradeLineItemFieldKey): boolean {
  const field = TRADE_LINE_ITEM_FIELD_CATALOG[key]
  return shouldEllipsizeColumn({ type: field.type, ellipsis: field.ellipsis })
}

/**
 * 提货明细列定义：以行实例（PickupListRow）为行模型，
 * 商品与仓库字段取自 row.item，数量与重量取拆分后的行值。
 *
 * 不再包含拖动列：排序改为整行拖动(鼠标按住拖动 / 触摸长按 / 键盘空格),
 * 顺序微调另有右键菜单的「上移/下移」。见 pickup-list-sortable.tsx。
 *
 * 列宽下限来自实测（12px 字号下「表头文字宽」与「内容示例宽」取大者 + 24px：
 * 左右 padding 8+8、边框与列宽拖拽把手的余量）：品牌 ≥73、类别 ≥49、材质 ≥96、
 * 规格 ≥58、长度 ≥74。短值列宽度不足时**不靠省略号圆场**，而是让表格横向滚动
 * （`scroll.x` 恒等于列宽合计，见 pickup-list-items-table.tsx 的 sumColumnWidths）。
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
        /*
         * 仓库名称**不设 ellipsis**：它是长文本，允许换行显示全名；
         * 截断成「海宁中心…」再靠 hover 看全名，反而比换行更难核对。
         */
        render: (_value, row) => displayText(row.item.warehouseName),
      },
      {
        // 「品牌」表头与 4 字品牌名取大者 73
        title: t('modules.columns.brand'),
        key: 'brand',
        width: 80,
        align: 'center',
        ellipsis: pickupColumnEllipsis('brand'),
        render: (_value, row) => row.item.brand,
      },
      {
        title: t('modules.purchasePickupList.itemName'),
        key: 'category',
        width: 80,
        align: 'center',
        ellipsis: pickupColumnEllipsis('category'),
        render: (_value, row) => row.item.category,
      },
      {
        /*
         * 材质最容易踩坑：「热轧带肋钢筋」6 个汉字 ×12px = 72，72+24 = 96；
         * 「HRB400E」52+24 = 76 也顶不住 6 汉字名称。原 80px 会截成「热轧带…」，
         * 故按实测下限补到 96。
         */
        title: t('modules.columns.material'),
        key: 'material',
        width: 96,
        align: 'center',
        ellipsis: pickupColumnEllipsis('material'),
        render: (_value, row) => row.item.material,
      },
      {
        title: t('modules.columns.spec'),
        key: 'spec',
        width: 96,
        align: 'center',
        ellipsis: pickupColumnEllipsis('spec'),
        render: (_value, row) => row.item.spec,
      },
      {
        // 「12米定尺」实测 50 + 24 = 74；取明细目录同一宽度 76
        title: t('modules.columns.length'),
        key: 'length',
        width: 76,
        align: 'center',
        ellipsis: pickupColumnEllipsis('length'),
        render: (_value, row) => displayText(row.item.length),
      },
      {
        title: t('modules.purchasePickupList.pickupQuantity'),
        key: 'quantity',
        dataIndex: 'quantity',
        width: 132,
        align: 'center',
        // 拆分行里这一格是 InputNumber + 份次标签，更不允许被省略号裁掉
        ellipsis: pickupColumnEllipsis('quantity'),
      },
      {
        title: t('modules.purchasePickupList.pieceWeight'),
        key: 'pieceWeightTon',
        width: 96,
        align: 'center',
        ellipsis: pickupColumnEllipsis('pieceWeightTon'),
        render: (_value, row) => formatWeight(row.item.pieceWeightTon),
      },
      {
        title: t('modules.purchasePickupList.pickupWeight'),
        key: 'weightTon',
        dataIndex: 'weightTon',
        width: 96,
        align: 'center',
        ellipsis: pickupColumnEllipsis('weightTon'),
        render: (value: number) => formatWeight(value),
      },
    ],
    [t],
  )
}
