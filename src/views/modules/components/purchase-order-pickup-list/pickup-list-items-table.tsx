import { ScissorOutlined, UndoOutlined } from '@ant-design/icons'
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
  /** 拆分一条明细为多份（按件数对半）。 */
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
        render: (_value, row) => (
          <div className="purchase-pickup-list-quantity-cell">
            {row.partCount > 1 ? (
              <Tag className="purchase-pickup-list-part-tag">
                {t('modules.purchasePickupList.splitPartLabel', {
                  index: row.partIndex + 1,
                  total: row.partCount,
                })}
              </Tag>
            ) : null}
            <InputNumber
              aria-label={t('modules.purchasePickupList.pickupQuantity')}
              className="purchase-pickup-list-quantity-input"
              controls={false}
              disabled={row.partCount <= 1}
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
        ),
      }
    },
  )

  const actionColumn: TableColumnsType<PickupListRow>[number] = {
    key: 'splitActions',
    width: 96,
    align: 'center',
    render: (_value, row) => {
      const removePartLabel = t('modules.purchasePickupList.removeSplitPart', {
        index: row.partIndex + 1,
      })
      return (
        <div className="purchase-pickup-list-row-actions">
          {row.partCount > 1 ? (
            <>
              {row.partCount > 2 ? (
                <Tooltip title={t('modules.purchasePickupList.mergeItem')}>
                  <Button
                    aria-label={t('modules.purchasePickupList.mergeItem')}
                    icon={<UndoOutlined />}
                    size="small"
                    type="text"
                    onClick={() => onMerge(row)}
                  />
                </Tooltip>
              ) : null}
              <Tooltip title={removePartLabel}>
                <Button
                  aria-label={removePartLabel}
                  icon={<ScissorOutlined />}
                  size="small"
                  type="text"
                  onClick={() => onRemovePart(row)}
                />
              </Tooltip>
            </>
          ) : (
            <Tooltip title={t('modules.purchasePickupList.splitItem')}>
              <Button
                aria-label={t('modules.purchasePickupList.splitItem')}
                disabled={row.quantity < 2}
                icon={<ScissorOutlined />}
                size="small"
                type="text"
                onClick={() => onSplit(row)}
              />
            </Tooltip>
          )}
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
