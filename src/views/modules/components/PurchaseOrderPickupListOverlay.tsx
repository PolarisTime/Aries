import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
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
import { rowDragKeyboardCodes } from '@/components/table/row-drag'
import { rowDragActivationConstraint } from '@/components/table/row-drag/row-drag-config'
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
import { buildPickupListDragAccessibility } from './purchase-order-pickup-list/pickup-list-drag-a11y'
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
   * 取消可见拖动手柄后, 整行/整分组头就是拖动激活点:
   *  - 鼠标: 长按 380ms 起拖 —— 阈值取共享的 rowDragActivationConstraint(), 不再自写一套;
   *  - 不再注册 TouchSensor: 应用只在 Windows/macOS + Chrome/Firefox 使用, 那份
   *    250ms 触摸阈值已作废(见 row-drag-config 的口径说明);
   *  - 键盘: Space/Enter 拾起 → 方向键移动 → Space/Enter 放下, Esc 取消。键位与行上
   *    aria-keyshortcuts 同源(row-drag-config 的单一键位模型);
   *  - 读屏: 覆写 accessibility, 播报「分组第 N 个 / 物料名 + 第 N 行」, 绝不播报行实例 id;
   *  - 非拖动替代: 分组头与明细行都有可点击的上移/下移按钮(SC 2.5.7)。
   */
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: rowDragActivationConstraint(),
    }),
    useSensor(KeyboardSensor, {
      keyboardCodes: rowDragKeyboardCodes(),
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const dragAccessibility = useMemo(
    () =>
      buildPickupListDragAccessibility({
        groupIds: draft.activeDraft.groups.map((group) => group.id),
        rows: draft.activeDraft.groups.flatMap(
          (group) => draft.groupedRows.get(group.id) ?? [],
        ),
        t,
      }),
    [draft.activeDraft.groups, draft.groupedRows, t],
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
      width="min(1440px, calc(100vw - 32px))"
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
                accessibility={dragAccessibility}
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
