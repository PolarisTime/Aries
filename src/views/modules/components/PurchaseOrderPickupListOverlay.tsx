import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core'
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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchProjectAbbreviationOptions } from '@/api/master/project-options'
import {
  fetchPurchaseOrderPickupList,
  type PurchaseOrderPickupListItem,
} from '@/api/purchase/purchase-order-pickup-list'
import { ResizableHeaderCell } from '@/components/table/ResizableHeaderCell'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import type { EntityId } from '@/types/entity-id'
import { formatWeight } from '@/utils/formatters'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import { usePickupListColumns } from './purchase-order-pickup-list/pickup-list-columns'
import {
  createPickupGroup,
  createWarehouseGroups,
  flattenGroupItemIds,
  GROUP_DRAG_TYPE,
  groupDragId,
  type PickupListDraft,
  pickupListCollisionDetection,
  reorderGroupedItems,
  reorderGroups,
  resolveDraft,
} from './purchase-order-pickup-list/pickup-list-draft'
import { PickupDraftGroupSection } from './purchase-order-pickup-list/pickup-list-drag-rows'
import { SortableRow } from './purchase-order-pickup-list/pickup-list-sortable'
import { PickupListSummary } from './purchase-order-pickup-list/pickup-list-summary'
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
  const [pickupDraft, setPickupDraft] = useState<PickupListDraft | null>(null)
  const { data, error, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: QUERY_KEYS.purchaseOrderPickupList(orderIds),
    queryFn: ({ signal }) => fetchPurchaseOrderPickupList(orderIds, signal),
    enabled: open,
    staleTime: 0,
  })
  const { data: projectOptions = [], isFetching: projectOptionsLoading } =
    useQuery({
      queryKey: QUERY_KEYS.masterOptions.projectAbbreviations,
      queryFn: ({ signal }) => fetchProjectAbbreviationOptions(signal),
      enabled: open,
      staleTime: 300_000,
    })
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
  const resizableComponents = useMemo<
    TableProps<PurchaseOrderPickupListItem>['components']
  >(
    () => ({
      body: { row: SortableRow },
      header: { cell: ResizableHeaderCell },
    }),
    [],
  )
  const { columns: resizableColumns } =
    useColumnResizing<PurchaseOrderPickupListItem>({
      columns,
      columnSizes,
      onResizePreview: handleColumnResizePreview,
      onResizeCommit: handleColumnResizeCommit,
      onResizeReset: handleColumnResizeReset,
      isResizable: (column) => column.key !== 'drag',
    })
  const defaultItems = useMemo(
    () => data?.groups.flatMap((group) => group.items) || [],
    [data],
  )
  const defaultItemIds = useMemo(
    () => defaultItems.map((item) => item.itemId),
    [defaultItems],
  )
  const dataKey = `${orderIds.join(',')}:${defaultItemIds.join(',')}`
  const activeDraft = useMemo(
    () => resolveDraft(pickupDraft, dataKey, defaultItemIds),
    [dataKey, defaultItemIds, pickupDraft],
  )
  const itemsById = useMemo(
    () => new Map(defaultItems.map((item) => [item.itemId, item])),
    [defaultItems],
  )

  const updateDraft = (
    updater: (current: PickupListDraft) => PickupListDraft,
  ) => {
    setPickupDraft((current) =>
      updater(resolveDraft(current, dataKey, defaultItemIds)),
    )
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)
    updateDraft((current) => ({
      ...current,
      groups:
        active.data.current?.type === GROUP_DRAG_TYPE
          ? reorderGroups(current.groups, activeId, overId)
          : reorderGroupedItems(current.groups, activeId, overId),
    }))
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return
    if (active.data.current?.type === GROUP_DRAG_TYPE) return
    const activeId = String(active.id)
    const overId = String(over.id)
    updateDraft((current) => {
      const groups = reorderGroupedItems(current.groups, activeId, overId)
      return groups === current.groups ? current : { ...current, groups }
    })
  }

  const removeGroup = (groupId: string) => {
    updateDraft((current) => {
      const groupIndex = current.groups.findIndex(
        (group) => group.id === groupId,
      )
      if (groupIndex < 0 || current.groups.length === 1) return current

      const removedGroup = current.groups[groupIndex]
      const groups = current.groups.flatMap((group) =>
        group.id === groupId ? [] : [{ ...group, itemIds: [...group.itemIds] }],
      )
      if (groupIndex === 0) {
        groups[0].itemIds = [...removedGroup.itemIds, ...groups[0].itemIds]
      } else {
        groups[groupIndex - 1].itemIds.push(...removedGroup.itemIds)
      }
      return { ...current, groups }
    })
  }

  const setGroupRemark = (groupId: string, remark: string) => {
    updateDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, remark } : group,
      ),
    }))
  }

  const setGroupLocked = (groupId: string, locked: boolean) => {
    updateDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, locked } : group,
      ),
    }))
  }

  const setGroupProject = (groupId: string, projectId?: EntityId) => {
    updateDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, projectId } : group,
      ),
    }))
  }

  const groupByWarehouse = () => {
    const groups = createWarehouseGroups(defaultItems)
    if (!groups.length) return
    updateDraft((current) => ({
      ...current,
      groups,
    }))
  }

  const addGroup = () => {
    updateDraft((current) => ({
      ...current,
      groups: [...current.groups, createPickupGroup()],
    }))
  }

  const summaryItems: Array<[string, string | number]> = data
    ? [
        [t('modules.purchasePickupList.orderCount'), data.orderCount],
        [t('modules.purchasePickupList.supplierCount'), data.supplierCount],
        [t('modules.purchasePickupList.itemCount'), data.itemCount],
        [t('modules.purchasePickupList.totalQuantity'), data.totalQuantity],
        [
          t('modules.purchasePickupList.totalWeight'),
          formatWeight(data.totalWeightTon),
        ],
      ]
    : []
  const hasCustomDraft =
    activeDraft.groups.length !== 1 ||
    activeDraft.groups.some(
      (group) =>
        group.locked || Boolean(group.projectId) || group.remark.length > 0,
    ) ||
    flattenGroupItemIds(activeDraft.groups).some(
      (itemId, index) => itemId !== defaultItemIds[index],
    )
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
                canGroup={defaultItems.length > 0}
                canRestore={hasCustomDraft}
                summaryItems={summaryItems}
                onAddGroup={addGroup}
                onClose={onClose}
                onGroupByWarehouse={groupByWarehouse}
                onRestore={() => setPickupDraft(null)}
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
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
              >
                <SortableContext
                  items={activeDraft.groups.map((group) =>
                    groupDragId(group.id),
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="purchase-pickup-list-groups">
                    {activeDraft.groups.map((group, index) => (
                      <PickupDraftGroupSection
                        key={group.id}
                        columns={resizableColumns}
                        components={resizableComponents}
                        emptyText={t('modules.purchasePickupList.emptyGroup')}
                        group={group}
                        groupCount={activeDraft.groups.length}
                        index={index}
                        items={group.itemIds.flatMap((itemId) => {
                          const item = itemsById.get(itemId)
                          return item ? [item] : []
                        })}
                        projectOptions={projectOptions}
                        projectOptionsLoading={projectOptionsLoading}
                        onLockedChange={setGroupLocked}
                        onProjectChange={setGroupProject}
                        onRemarkChange={setGroupRemark}
                        onRemove={removeGroup}
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
