import { DeleteOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TableColumnsType, TableProps } from 'antd'
import { Button, Input, Tag, Tooltip, Typography } from 'antd'
import { type CSSProperties, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatWeight } from '@/utils/formatters'
import type { PickupDraftGroup, PickupListRow } from './pickup-list-draft'
import {
  GROUP_DRAG_TYPE,
  groupDragId,
  resolveWarehouseLabel,
} from './pickup-list-draft'
import {
  DragHandleContext,
  type DragHandleContextValue,
} from './pickup-list-drag-context'
import { PickupItemsTable } from './pickup-list-items-table'
import { DragHandle } from './pickup-list-sortable'

interface PickupDraftGroupSectionProps {
  columns: TableColumnsType<PickupListRow>
  components: TableProps<PickupListRow>['components']
  emptyText: string
  group: PickupDraftGroup
  groupCount: number
  index: number
  rows: PickupListRow[]
  onLockedChange: (groupId: string, locked: boolean) => void
  onRemarkChange: (groupId: string, remark: string) => void
  onRemove: (groupId: string) => void
  onQuantityChange: (row: PickupListRow, quantity: number) => void
  onSplit: (row: PickupListRow) => void
  onMerge: (row: PickupListRow) => void
  onRemovePart: (row: PickupListRow) => void
}

export function PickupDraftGroupSection({
  columns,
  components,
  emptyText,
  group,
  groupCount,
  index,
  rows,
  onLockedChange,
  onRemarkChange,
  onRemove,
  onQuantityChange,
  onSplit,
  onMerge,
  onRemovePart,
}: PickupDraftGroupSectionProps) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: groupDragId(group.id),
    data: {
      type: GROUP_DRAG_TYPE,
      groupId: group.id,
    },
  })
  const style: CSSProperties = {
    transform: transform
      ? CSS.Transform.toString({ ...transform, x: 0 })
      : undefined,
    transition,
  }
  const dragHandleContextValue = useMemo<DragHandleContextValue>(
    () => ({ attributes, listeners, setActivatorNodeRef }),
    [attributes, listeners, setActivatorNodeRef],
  )
  const groupTotals = rows.reduce(
    (totals, row) => ({
      quantity: totals.quantity + row.quantity,
      weightTon: totals.weightTon + row.weightTon,
    }),
    { quantity: 0, weightTon: 0 },
  )
  // 明细数按来源明细去重统计，拆分份不重复计数。
  const sourceItemCount = new Set(rows.map((row) => row.baseItemId)).size
  const removeLabel = t('modules.purchasePickupList.removeGroup', {
    index: index + 1,
  })
  const dragLabel = t('modules.purchasePickupList.dragGroup', {
    index: index + 1,
  })
  const warehouseLabel = resolveWarehouseLabel(
    rows.map((row) => row.item),
    t('modules.purchasePickupList.unassignedWarehouse'),
  )
  const lockLabel = t(
    group.locked
      ? 'modules.purchasePickupList.unlockGroup'
      : 'modules.purchasePickupList.lockGroup',
    { index: index + 1 },
  )

  return (
    <DragHandleContext.Provider value={dragHandleContextValue}>
      <section
        ref={setNodeRef}
        className={`purchase-pickup-list-group${isOver ? ' purchase-pickup-list-group--drop-target' : ''}${isDragging ? ' purchase-pickup-list-group--dragging' : ''}`}
        style={style}
      >
        <div className="purchase-pickup-list-group-header">
          <div className="purchase-pickup-list-group-title">
            <DragHandle label={dragLabel} />
            <Typography.Text strong>
              {t('modules.purchasePickupList.groupLabel', { index: index + 1 })}
            </Typography.Text>
            {warehouseLabel ? <Tag color="blue">{warehouseLabel}</Tag> : null}
            <Tag>
              {t('modules.purchasePickupList.groupItemCount', {
                count: sourceItemCount,
              })}
            </Tag>
            <span className="purchase-pickup-list-group-total">
              <Typography.Text type="secondary">
                {t('modules.purchasePickupList.groupTotalQuantity')}：
              </Typography.Text>
              <Typography.Text strong>{groupTotals.quantity}</Typography.Text>
            </span>
            <span className="purchase-pickup-list-group-total">
              <Typography.Text type="secondary">
                {t('modules.purchasePickupList.groupTotalWeight')}：
              </Typography.Text>
              <Typography.Text strong>
                {formatWeight(groupTotals.weightTon)}
                {t('modules.units.ton')}
              </Typography.Text>
            </span>
          </div>
          <div className="purchase-pickup-list-group-controls">
            <Input
              allowClear
              className="purchase-pickup-list-group-remark"
              maxLength={200}
              placeholder={t(
                'modules.purchasePickupList.groupRemarkPlaceholder',
              )}
              value={group.remark}
              onChange={(event) =>
                onRemarkChange(group.id, event.currentTarget.value)
              }
            />
            <Tooltip title={lockLabel}>
              <Button
                aria-label={lockLabel}
                aria-pressed={group.locked}
                icon={group.locked ? <LockOutlined /> : <UnlockOutlined />}
                type={group.locked ? 'primary' : 'text'}
                onClick={() => onLockedChange(group.id, !group.locked)}
              />
            </Tooltip>
            <Tooltip title={removeLabel}>
              <Button
                aria-label={removeLabel}
                disabled={groupCount === 1}
                icon={<DeleteOutlined />}
                type="text"
                onClick={() => onRemove(group.id)}
              />
            </Tooltip>
          </div>
        </div>
        <PickupItemsTable
          columns={columns}
          components={components}
          emptyText={emptyText}
          rows={rows}
          onMerge={onMerge}
          onQuantityChange={onQuantityChange}
          onRemovePart={onRemovePart}
          onSplit={onSplit}
        />
      </section>
    </DragHandleContext.Provider>
  )
}
