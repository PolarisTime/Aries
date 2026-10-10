import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useQuery } from '@tanstack/react-query'
import type { TableProps } from 'antd'
import { Alert, Button, Spin } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchPurchaseOrderPickupList } from '@/api/purchase/purchase-order-pickup-list'
import { ResizableHeaderCell } from '@/components/table/ResizableHeaderCell'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import type { EntityId } from '@/types/entity-id'
import { formatWeight } from '@/utils/formatters'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import { PickupSplitModal } from './purchase-order-pickup-list/PickupSplitModal'
import { usePickupListColumns } from './purchase-order-pickup-list/pickup-list-columns'
import {
  GROUP_DRAG_TYPE,
  groupDragId,
  type PickupListRow,
  pickupListCollisionDetection,
  reorderGroupedItems,
  reorderGroups,
} from './purchase-order-pickup-list/pickup-list-draft'
import { PickupDraftGroupSection } from './purchase-order-pickup-list/pickup-list-drag-rows'
import { SortableRow } from './purchase-order-pickup-list/pickup-list-sortable'
import { PickupListSummary } from './purchase-order-pickup-list/pickup-list-summary'
import { usePickupListDraft } from './purchase-order-pickup-list/use-pickup-list-draft'
import '@/styles/purchase-pickup-list.css'

interface Props {
  open: boolean
  orderIds: EntityId[]
  onClose: () => void
}

export function PurchaseOrderPickupListOverlay({
  open,
  orderIds,
  onClose,
}: Props) {
  const { t } = useTranslation()
  /** 待拆分行(undefined 表示拆分弹窗未打开)。 */
  const [splitRowId, setSplitRowId] = useState<string | undefined>(undefined)
  const { data, error, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: QUERY_KEYS.purchaseOrderPickupList(orderIds),
    queryFn: ({ signal }) => fetchPurchaseOrderPickupList(orderIds, signal),
    enabled: open,
    staleTime: 0,
  })
  const draft = usePickupListDraft(data, orderIds)

  /**
   * 上移/下移一行: 与拖动共用 reorderGroupedItems, 因此跨分组/锁定分组的规则完全一致,
   * 不会出现"菜单能移、拖动不能移"的口径漂移。
   */
  const moveRow = (row: PickupListRow, direction: 'up' | 'down') => {
    const rowId = row.rowId
    draft.updateDraft((current) => {
      const group = current.groups.find((item) => item.itemIds.includes(rowId))
      if (!group) return current
      const index = group.itemIds.indexOf(rowId)
      const targetId = group.itemIds[direction === 'up' ? index - 1 : index + 1]
      if (!targetId) return current
      const groups = reorderGroupedItems(current.groups, rowId, targetId)
      return groups === current.groups ? current : { ...current, groups }
    })
  }

  /** 上移/下移一个分组(与分组拖动共用 reorderGroups)。 */
  const moveGroup = (groupId: string, direction: 'up' | 'down') => {
    draft.updateDraft((current) => {
      const index = current.groups.findIndex((item) => item.id === groupId)
      const target = current.groups[direction === 'up' ? index - 1 : index + 1]
      if (index < 0 || !target) return current
      const groups = reorderGroups(
        current.groups,
        groupDragId(groupId),
        groupDragId(target.id),
      )
      return groups === current.groups ? current : { ...current, groups }
    })
  }
  /*
   * 取消可见拖动手柄后, 整行/整分组头就是拖动激活点, 三个传感器各司其职:
   *  - 鼠标: 按住后移动 8px 起拖, 单纯点击不受影响;
   *  - 触摸: 长按 250ms 起拖(不用 PointerSensor: 它在触摸下要求 touch-action:none,
   *    那会让列表无法用手指滚动); 长按期间移动超过容差即取消, 保留滚动;
   *  - 键盘: 聚焦后用空格拾起、方向键移动、空格放下。
   */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const columns = usePickupListColumns()
  const {
    columnSizes,
    handleColumnResizePreview,
    handleColumnResizeCommit,
    handleColumnResizeReset,
  } = useColumnSettingsSupport(
    'purchase-order:pickup-list',
    undefined,
    columns.length,
  )
  // dnd-kit 行拖拽与列宽把手并存：合并 body.row 与 header.cell
  const resizableComponents = useMemo<TableProps<PickupListRow>['components']>(
    () => ({
      body: { row: SortableRow },
      header: { cell: ResizableHeaderCell },
    }),
    [],
  )
  const { columns: resizableColumns } = useColumnResizing<PickupListRow>({
    columns,
    columnSizes,
    onResizePreview: handleColumnResizePreview,
    onResizeCommit: handleColumnResizeCommit,
    onResizeReset: handleColumnResizeReset,
    isResizable: (column) => column.key !== 'drag',
  })

  const summaryItems: Array<[string, string | number]> = data
    ? [
        [t('modules.purchasePickupList.orderCount'), data.orderCount],
        [t('modules.purchasePickupList.supplierCount'), data.supplierCount],
        [t('modules.purchasePickupList.itemCount'), draft.defaultItems.length],
        [t('modules.purchasePickupList.totalQuantity'), draft.totals.quantity],
        [
          t('modules.purchasePickupList.totalWeight'),
          formatWeight(draft.totals.weightTon),
        ],
      ]
    : []
  const errorMessage =
    error instanceof Error
      ? error.message
      : t('modules.purchasePickupList.loadFailed')

  return (
    <WorkspaceOverlay
      title={t('modules.purchasePickupList.title', { count: orderIds.length })}
      open={open}
      onClose={onClose}
      width={1440}
    >
      <Spin spinning={isPending || isFetching}>
        <div className="purchase-pickup-list-content">
          {isError ? (
            <Alert
              action={
                <Button size="small" onClick={() => void refetch()}>
                  {t('errorBoundary.retry')}
                </Button>
              }
              title={errorMessage}
              showIcon
              type="error"
            />
          ) : null}
          {data ? (
            <>
              <PickupListSummary
                canGroup={draft.defaultItems.length > 0}
                canRestore={draft.hasCustomDraft}
                summaryItems={summaryItems}
                onAddGroup={draft.addGroup}
                onClose={onClose}
                onGroupByWarehouse={draft.groupByWarehouse}
                onRestore={draft.resetDraft}
              />
              {data.warnings.length ? (
                <Alert
                  title={data.warnings.join('；')}
                  showIcon
                  type="warning"
                />
              ) : null}
              <DndContext
                sensors={sensors}
                collisionDetection={pickupListCollisionDetection}
                onDragEnd={({ active, over }) => {
                  if (!over || active.id === over.id) return
                  draft.handleDragEnd(
                    String(active.id),
                    String(over.id),
                    active.data.current?.type === GROUP_DRAG_TYPE,
                  )
                }}
                onDragOver={({ active, over }) => {
                  if (!over || active.id === over.id) return
                  if (active.data.current?.type === GROUP_DRAG_TYPE) return
                  draft.handleDragOver(String(active.id), String(over.id))
                }}
              >
                <SortableContext
                  items={draft.activeDraft.groups.map((group) =>
                    groupDragId(group.id),
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="purchase-pickup-list-groups">
                    {draft.activeDraft.groups.map((group, index) => (
                      <PickupDraftGroupSection
                        key={group.id}
                        columns={resizableColumns}
                        components={resizableComponents}
                        emptyText={t('modules.purchasePickupList.emptyGroup')}
                        group={group}
                        groupCount={draft.activeDraft.groups.length}
                        index={index}
                        rows={draft.groupedRows.get(group.id) || []}
                        onLockedChange={draft.setGroupLocked}
                        onMerge={draft.mergeRow}
                        onQuantityChange={draft.changeRowQuantity}
                        onRemarkChange={draft.setGroupRemark}
                        onRemove={draft.removeGroup}
                        onRemovePart={draft.removeRowPart}
                        onMoveGroup={moveGroup}
                        onMoveRow={moveRow}
                        onSplit={(row) => setSplitRowId(row.rowId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <PickupSplitModal
                open={splitRowId !== undefined}
                row={
                  splitRowId
                    ? Array.from(draft.groupedRows.values())
                        .flat()
                        .find((row) => row.rowId === splitRowId)
                    : undefined
                }
                onClose={() => setSplitRowId(undefined)}
                onConfirm={(pieceCount) => {
                  const target = Array.from(draft.groupedRows.values())
                    .flat()
                    .find((row) => row.rowId === splitRowId)
                  if (target) {
                    draft.splitRow(target, pieceCount)
                  }
                  setSplitRowId(undefined)
                }}
              />
            </>
          ) : null}
        </div>
      </Spin>
    </WorkspaceOverlay>
  )
}
