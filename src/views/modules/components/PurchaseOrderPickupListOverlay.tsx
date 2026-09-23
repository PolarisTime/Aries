import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchPurchaseOrderPickupList } from '@/api/purchase/purchase-order-pickup-list'
import { ResizableHeaderCell } from '@/components/table/ResizableHeaderCell'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import type { EntityId } from '@/types/entity-id'
import { formatWeight } from '@/utils/formatters'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import { usePickupListColumns } from './purchase-order-pickup-list/pickup-list-columns'
import {
  GROUP_DRAG_TYPE,
  groupDragId,
  type PickupListRow,
  pickupListCollisionDetection,
} from './purchase-order-pickup-list/pickup-list-draft'
import { PickupDraftGroupSection } from './purchase-order-pickup-list/pickup-list-drag-rows'
import { PickupSplitNotice } from './purchase-order-pickup-list/pickup-list-items-table'
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
  const { data, error, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: QUERY_KEYS.purchaseOrderPickupList(orderIds),
    queryFn: ({ signal }) => fetchPurchaseOrderPickupList(orderIds, signal),
    enabled: open,
    staleTime: 0,
  })
  const draft = usePickupListDraft(data, orderIds)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
              <PickupSplitNotice />
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
                        onSplit={draft.splitRow}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          ) : null}
        </div>
      </Spin>
    </WorkspaceOverlay>
  )
}
