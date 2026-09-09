import { DeleteOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TableColumnsType, TableProps } from 'antd'
import { Button, Input, Select, Table, Tag, Tooltip, Typography } from 'antd'
import { type CSSProperties, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectAbbreviationOption } from '@/api/master/project-options'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import type { EntityId } from '@/types/entity-id'
import { formatWeight } from '@/utils/formatters'
import { sumColumnWidths } from '@/views/modules/components/business-grid-table-utils'
import {
  GROUP_DRAG_TYPE,
  groupDragId,
  type PickupDraftGroup,
  resolveWarehouseLabel,
} from './pickup-list-draft'
import {
  DragHandle,
  DragHandleContext,
  type DragHandleContextValue,
} from './pickup-list-sortable'

interface PickupItemsTableProps {
  columns: TableColumnsType<PurchaseOrderPickupListItem>
  components: TableProps<PurchaseOrderPickupListItem>['components']
  emptyText: string
  items: PurchaseOrderPickupListItem[]
}

function PickupItemsTable({
  columns,
  components,
  emptyText,
  items,
}: PickupItemsTableProps) {
  const scrollX = sumColumnWidths(columns.map((column) => column.width))
  return (
    <SortableContext
      items={items.map((item) => item.itemId)}
      strategy={verticalListSortingStrategy}
    >
      <Table<PurchaseOrderPickupListItem>
        columns={columns}
        components={components}
        dataSource={items}
        locale={{ emptyText }}
        pagination={false}
        rowKey="itemId"
        scroll={{ x: scrollX }}
        size="small"
      />
    </SortableContext>
  )
}

interface PickupDraftGroupSectionProps extends PickupItemsTableProps {
  group: PickupDraftGroup
  groupCount: number
  index: number
  projectOptions: ProjectAbbreviationOption[]
  projectOptionsLoading: boolean
  onLockedChange: (groupId: string, locked: boolean) => void
  onProjectChange: (groupId: string, projectId?: EntityId) => void
  onRemarkChange: (groupId: string, remark: string) => void
  onRemove: (groupId: string) => void
}

export function PickupDraftGroupSection({
  columns,
  components,
  emptyText,
  group,
  groupCount,
  index,
  items,
  onLockedChange,
  onProjectChange,
  onRemarkChange,
  onRemove,
  projectOptions,
  projectOptionsLoading,
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
  const groupTotals = items.reduce(
    (totals, item) => ({
      quantity: totals.quantity + item.pickupQuantity,
      weightTon: totals.weightTon + item.pickupWeightTon,
    }),
    { quantity: 0, weightTon: 0 },
  )
  const removeLabel = t('modules.purchasePickupList.removeGroup', {
    index: index + 1,
  })
  const dragLabel = t('modules.purchasePickupList.dragGroup', {
    index: index + 1,
  })
  const warehouseLabel = resolveWarehouseLabel(
    items,
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
                count: items.length,
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
            <div className="purchase-pickup-list-group-project-field">
              <Typography.Text className="purchase-pickup-list-group-project-label">
                {t('modules.purchasePickupList.groupProjectLabel')}
              </Typography.Text>
              <Select<EntityId>
                aria-label={t('modules.purchasePickupList.groupProjectLabel')}
                allowClear
                className="purchase-pickup-list-group-project"
                loading={projectOptionsLoading}
                options={projectOptions}
                placeholder={t(
                  'modules.purchasePickupList.groupProjectPlaceholder',
                )}
                showSearch={{ optionFilterProp: 'label' }}
                title={
                  projectOptions.find(
                    (option) => option.value === group.projectId,
                  )?.title
                }
                value={group.projectId}
                onChange={(value) =>
                  onProjectChange(group.id, value || undefined)
                }
              />
            </div>
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
          items={items}
        />
      </section>
    </DragHandleContext.Provider>
  )
}
