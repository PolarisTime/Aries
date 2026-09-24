import {
  DeleteOutlined,
  SplitCellsOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { TableColumnsType, TableProps } from 'antd'
import { Button, InputNumber, Table, Tag, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { sumColumnWidths } from '@/views/modules/components/business-grid-table-utils'
import type { PickupListRow } from './pickup-list-draft'

interface PickupItemsTableProps {
  columns: TableColumnsType<PickupListRow>
  components: TableProps<PickupListRow>['components']
  emptyText: string
  rows: PickupListRow[]
  /** 调整某份件数（差额自动落到同来源相邻份）。 */
  onQuantityChange: (row: PickupListRow, quantity: number) => void
  /** 打开拆分弹窗(指定每份件数)。 */
  onSplit: (row: PickupListRow) => void
  /** 合并该来源明细的全部拆分份。 */
  onMerge: (row: PickupListRow) => void
  /** 移除某一份（件数合并回相邻份）。 */
  onRemovePart: (row: PickupListRow) => void
}

/**
 * 提货明细表：行实例带拆分份次，数量可编辑且增/删份保持件数守恒，
 * 汇总与分组合计始终以拆分后的数值为准。
 */
export function PickupItemsTable({
  columns,
  components,
  emptyText,
  rows,
  onQuantityChange,
  onSplit,
  onMerge,
  onRemovePart,
}: PickupItemsTableProps) {
  const { t } = useTranslation()
  const scrollX = sumColumnWidths(columns.map((column) => column.width))

  const mergedColumns: TableColumnsType<PickupListRow> = columns.map(
    (column) => {
      if (!('dataIndex' in column) || column.dataIndex !== 'quantity') {
        return column
      }
      return {
        ...column,
        render: (_value, row) => {
          // 未拆分: 保持与其它列一致的纯文本展示(默认外观)。
          if (row.partCount <= 1) {
            return (
              <span className="purchase-pickup-list-quantity">
                {row.quantity}
              </span>
            )
          }
          // 拆分行: 展示份次标签与可编辑数量。
          return (
            <div className="purchase-pickup-list-quantity-cell">
              <Tag className="purchase-pickup-list-part-tag">
                {t('modules.purchasePickupList.splitPartLabel', {
                  index: row.partIndex + 1,
                  total: row.partCount,
                })}
              </Tag>
              <InputNumber
                aria-label={t('modules.purchasePickupList.pickupQuantity')}
                className="purchase-pickup-list-quantity-input"
                controls={false}
                min={1}
                precision={0}
                size="small"
                value={row.quantity}
                onChange={(value) => {
                  if (typeof value === 'number') {
                    onQuantityChange(row, value)
                  }
                }}
              />
            </div>
          )
        },
      }
    },
  )

  const actionColumn: TableColumnsType<PickupListRow>[number] = {
    key: 'splitActions',
    width: 88,
    align: 'center',
    render: (_value, row) => {
      const removePartLabel = t('modules.purchasePickupList.removeSplitPart', {
        index: row.partIndex + 1,
      })
      const mergeLabel = t('modules.purchasePickupList.mergeItem')
      // 未拆分: 仅提供「拆分」(打开弹窗指定每份件数)。
      if (row.partCount <= 1) {
        return (
          <div className="purchase-pickup-list-row-actions">
            <Tooltip title={t('modules.purchasePickupList.splitItem')}>
              <Button
                aria-label={t('modules.purchasePickupList.splitItem')}
                disabled={row.quantity < 2}
                icon={<SplitCellsOutlined />}
                size="small"
                type="text"
                onClick={() => onSplit(row)}
              />
            </Tooltip>
          </div>
        )
      }
      // 已拆分: 每份均可「移除本份」, 另有「合并全部份」。移除末份或合并都会回到合适态。
      return (
        <div className="purchase-pickup-list-row-actions">
          <Tooltip title={mergeLabel}>
            <Button
              aria-label={mergeLabel}
              disabled={row.partCount <= 2}
              icon={<UndoOutlined />}
              size="small"
              type="text"
              onClick={() => onMerge(row)}
            />
          </Tooltip>
          <Tooltip title={removePartLabel}>
            <Button
              aria-label={removePartLabel}
              icon={<DeleteOutlined />}
              size="small"
              type="text"
              onClick={() => onRemovePart(row)}
            />
          </Tooltip>
        </div>
      )
    },
  }

  return (
    <SortableContext
      items={rows.map((row) => row.rowId)}
      strategy={verticalListSortingStrategy}
    >
      <Table<PickupListRow>
        columns={[...mergedColumns, actionColumn]}
        components={components}
        dataSource={rows}
        locale={{ emptyText }}
        pagination={false}
        rowKey="rowId"
        scroll={{ x: scrollX }}
        size="small"
      />
    </SortableContext>
  )
}

/** 拆分提示：说明本次拆分不会写回采购订单。 */
export function PickupSplitNotice() {
  const { t } = useTranslation()
  return (
    <Typography.Text
      className="purchase-pickup-list-split-notice"
      type="secondary"
    >
      {t('modules.purchasePickupList.splitRecorded')}
    </Typography.Text>
  )
}
