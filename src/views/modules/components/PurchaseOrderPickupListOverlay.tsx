import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import type {
  DragEndEvent,
  DraggableAttributes,
  DraggableSyntheticListeners,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Flex,
  Input,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  type CSSProperties,
  createContext,
  type HTMLAttributes,
  use,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchPurchaseOrderPickupList,
  type PurchaseOrderPickupListItem,
} from '@/api/purchase/purchase-order-pickup-list'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { EntityId } from '@/types/entity-id'
import { formatWeight } from '@/utils/formatters'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import '@/styles/purchase-pickup-list.css'

interface Props {
  open: boolean
  orderIds: EntityId[]
  onClose: () => void
}

interface DragHandleContextValue {
  attributes?: DraggableAttributes
  listeners?: DraggableSyntheticListeners
  setActivatorNodeRef?: (element: HTMLElement | null) => void
}

interface SortableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

const DragHandleContext = createContext<DragHandleContextValue>({})

function displayText(value: string | null | undefined) {
  const text = value?.trim()
  return text || '-'
}

function DragHandle({ label }: { label: string }) {
  const { attributes, listeners, setActivatorNodeRef } = use(DragHandleContext)

  return (
    <Tooltip title={label}>
      <Button
        {...attributes}
        {...listeners}
        ref={setActivatorNodeRef}
        aria-label={label}
        className="purchase-pickup-list-drag-handle"
        icon={<HolderOutlined />}
        size="small"
        type="text"
      />
    </Tooltip>
  )
}

function usePickupListColumns() {
  const { t } = useTranslation()

  return useMemo<TableColumnsType<PurchaseOrderPickupListItem>>(
    () => [
      {
        key: 'drag',
        width: 48,
        align: 'center',
        render: (_value, _record, index) => (
          <DragHandle
            label={t('modules.purchasePickupList.dragRow', {
              index: index + 1,
            })}
          />
        ),
      },
      {
        title: t('modules.columns.purchaseOrderNo'),
        dataIndex: 'orderNo',
        width: 176,
      },
      {
        title: t('modules.columns.warehouseName'),
        dataIndex: 'warehouseName',
        width: 144,
        render: (value: string | null) => displayText(value),
      },
      {
        title: t('modules.columns.brand'),
        dataIndex: 'brand',
        width: 96,
        ellipsis: true,
      },
      {
        title: t('modules.purchasePickupList.itemName'),
        dataIndex: 'category',
        width: 96,
        ellipsis: true,
      },
      {
        title: t('modules.columns.material'),
        dataIndex: 'material',
        width: 96,
        ellipsis: true,
      },
      {
        title: t('modules.columns.spec'),
        dataIndex: 'spec',
        width: 112,
        ellipsis: true,
      },
      {
        title: t('modules.columns.length'),
        dataIndex: 'length',
        width: 80,
        align: 'center',
        render: (value: string | null) => displayText(value),
      },
      {
        title: t('modules.purchasePickupList.pickupQuantity'),
        dataIndex: 'pickupQuantity',
        width: 96,
        align: 'right',
      },
      {
        title: t('modules.purchasePickupList.pieceWeight'),
        dataIndex: 'pieceWeightTon',
        width: 104,
        align: 'right',
        render: (value: number) => formatWeight(value),
      },
      {
        title: t('modules.purchasePickupList.pickupWeight'),
        dataIndex: 'pickupWeightTon',
        width: 116,
        align: 'right',
        render: (value: number) => formatWeight(value),
      },
    ],
    [t],
  )
}

function SortableRow(props: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props['data-row-key'] })
  const style: CSSProperties = {
    ...props.style,
    transform: transform
      ? CSS.Transform.toString({ ...transform, x: 0 })
      : undefined,
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 2, opacity: 0.72 } : {}),
  }
  const contextValue = useMemo<DragHandleContextValue>(
    () => ({ attributes, listeners, setActivatorNodeRef }),
    [attributes, listeners, setActivatorNodeRef],
  )

  return (
    <DragHandleContext.Provider value={contextValue}>
      <tr
        {...props}
        ref={setNodeRef}
        className={`${props.className || ''}${isDragging ? ' purchase-pickup-list-row--dragging' : ''}`}
        style={style}
      />
    </DragHandleContext.Provider>
  )
}

interface PickupDraftGroup {
  id: string
  remark: string
  itemIds: string[]
}

interface PickupListDraft {
  dataKey: string
  groupingEnabled: boolean
  groups: PickupDraftGroup[]
}

interface PickupItemsTableProps {
  columns: TableColumnsType<PurchaseOrderPickupListItem>
  emptyText: string
  items: PurchaseOrderPickupListItem[]
}

interface PickupDraftGroupSectionProps extends PickupItemsTableProps {
  group: PickupDraftGroup
  groupCount: number
  index: number
  onRemarkChange: (groupId: string, remark: string) => void
  onRemove: (groupId: string) => void
}

const DEFAULT_GROUP_ID = 'pickup-group-default'
const GROUP_DROP_PREFIX = 'pickup-group-drop:'
const TABLE_COMPONENTS = { body: { row: SortableRow } }
let nextPickupGroupId = 0

function createPickupGroup(itemIds: string[] = []): PickupDraftGroup {
  nextPickupGroupId += 1
  return {
    id: `pickup-group-${nextPickupGroupId}`,
    remark: '',
    itemIds,
  }
}

function createDefaultDraft(
  dataKey: string,
  itemIds: string[],
): PickupListDraft {
  return {
    dataKey,
    groupingEnabled: false,
    groups: [{ id: DEFAULT_GROUP_ID, remark: '', itemIds: [...itemIds] }],
  }
}

function resolveDraft(
  draft: PickupListDraft | null,
  dataKey: string,
  defaultItemIds: string[],
): PickupListDraft {
  if (!draft || draft.dataKey !== dataKey || !draft.groups.length) {
    return createDefaultDraft(dataKey, defaultItemIds)
  }

  const validItemIds = new Set(defaultItemIds)
  const assignedItemIds = new Set<string>()
  const groups = draft.groups.map((group) => ({
    ...group,
    itemIds: group.itemIds.filter((itemId) => {
      if (!validItemIds.has(itemId) || assignedItemIds.has(itemId)) return false
      assignedItemIds.add(itemId)
      return true
    }),
  }))
  const unassignedItemIds = defaultItemIds.filter(
    (itemId) => !assignedItemIds.has(itemId),
  )
  if (unassignedItemIds.length) {
    groups[0] = {
      ...groups[0],
      itemIds: [...groups[0].itemIds, ...unassignedItemIds],
    }
  }

  return { ...draft, groups }
}

function flattenGroupItemIds(groups: PickupDraftGroup[]) {
  return groups.flatMap((group) => group.itemIds)
}

function reorderFlatGroups(
  groups: PickupDraftGroup[],
  activeId: string,
  overId: string,
) {
  const itemIds = flattenGroupItemIds(groups)
  const activeIndex = itemIds.indexOf(activeId)
  const overIndex = itemIds.indexOf(overId)
  if (activeIndex < 0 || overIndex < 0) return groups

  const reorderedItemIds = arrayMove(itemIds, activeIndex, overIndex)
  let offset = 0
  return groups.map((group) => {
    const nextItemIds = reorderedItemIds.slice(
      offset,
      offset + group.itemIds.length,
    )
    offset += group.itemIds.length
    return { ...group, itemIds: nextItemIds }
  })
}

function reorderGroupedItems(
  groups: PickupDraftGroup[],
  activeId: string,
  overId: string,
) {
  const sourceGroupIndex = groups.findIndex((group) =>
    group.itemIds.includes(activeId),
  )
  const targetGroupId = overId.startsWith(GROUP_DROP_PREFIX)
    ? overId.slice(GROUP_DROP_PREFIX.length)
    : undefined
  const targetGroupIndex = targetGroupId
    ? groups.findIndex((group) => group.id === targetGroupId)
    : groups.findIndex((group) => group.itemIds.includes(overId))
  if (sourceGroupIndex < 0 || targetGroupIndex < 0) return groups

  if (sourceGroupIndex === targetGroupIndex) {
    const itemIds = groups[sourceGroupIndex].itemIds
    const activeIndex = itemIds.indexOf(activeId)
    const overIndex = itemIds.indexOf(overId)
    if (activeIndex < 0 || overIndex < 0) return groups
    return groups.map((group, index) =>
      index === sourceGroupIndex
        ? { ...group, itemIds: arrayMove(itemIds, activeIndex, overIndex) }
        : group,
    )
  }

  const nextGroups = groups.map((group) => ({
    ...group,
    itemIds: [...group.itemIds],
  }))
  nextGroups[sourceGroupIndex].itemIds = nextGroups[
    sourceGroupIndex
  ].itemIds.filter((itemId) => itemId !== activeId)
  const targetItemIds = nextGroups[targetGroupIndex].itemIds
  const overIndex = targetGroupId
    ? targetItemIds.length
    : targetItemIds.indexOf(overId)
  targetItemIds.splice(
    overIndex < 0 ? targetItemIds.length : overIndex,
    0,
    activeId,
  )
  return nextGroups
}

function PickupItemsTable({
  columns,
  emptyText,
  items,
}: PickupItemsTableProps) {
  return (
    <SortableContext
      items={items.map((item) => item.itemId)}
      strategy={verticalListSortingStrategy}
    >
      <Table<PurchaseOrderPickupListItem>
        columns={columns}
        components={TABLE_COMPONENTS}
        dataSource={items}
        locale={{ emptyText }}
        pagination={false}
        rowKey="itemId"
        scroll={{ x: 1168 }}
        size="small"
      />
    </SortableContext>
  )
}

function PickupDraftGroupSection({
  columns,
  emptyText,
  group,
  groupCount,
  index,
  items,
  onRemarkChange,
  onRemove,
}: PickupDraftGroupSectionProps) {
  const { t } = useTranslation()
  const { isOver, setNodeRef } = useDroppable({
    id: `${GROUP_DROP_PREFIX}${group.id}`,
  })
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

  return (
    <section
      ref={setNodeRef}
      className={`purchase-pickup-list-group${isOver ? ' purchase-pickup-list-group--drop-target' : ''}`}
    >
      <div className="purchase-pickup-list-group-header">
        <div className="purchase-pickup-list-group-title">
          <Typography.Text strong>
            {t('modules.purchasePickupList.groupLabel', { index: index + 1 })}
          </Typography.Text>
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
          <Input
            allowClear
            className="purchase-pickup-list-group-remark"
            maxLength={200}
            placeholder={t('modules.purchasePickupList.groupRemarkPlaceholder')}
            value={group.remark}
            onChange={(event) =>
              onRemarkChange(group.id, event.currentTarget.value)
            }
          />
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
      <PickupItemsTable columns={columns} emptyText={emptyText} items={items} />
    </section>
  )
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const columns = usePickupListColumns()
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
      groups: current.groupingEnabled
        ? reorderGroupedItems(current.groups, activeId, overId)
        : reorderFlatGroups(current.groups, activeId, overId),
    }))
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)
    updateDraft((current) => {
      if (!current.groupingEnabled) return current

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

  const summaryItems = data
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
    activeDraft.groupingEnabled ||
    activeDraft.groups.length !== 1 ||
    activeDraft.groups.some((group) => group.remark.length > 0) ||
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
      footer={
        <>
          <Button
            disabled={!hasCustomDraft}
            icon={<UndoOutlined />}
            onClick={() => setPickupDraft(null)}
          >
            {t('modules.purchasePickupList.restoreDefault')}
          </Button>
          <Button type="primary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </>
      }
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
              <Flex
                align="center"
                className="purchase-pickup-list-summary"
                gap={16}
                justify="space-between"
                wrap
              >
                <Flex
                  align="center"
                  className="purchase-pickup-list-summary-metrics"
                  gap={24}
                  wrap
                >
                  {summaryItems.map(([label, value]) => (
                    <span
                      key={String(label)}
                      className="purchase-pickup-list-metric"
                    >
                      <Typography.Text type="secondary">
                        {label}：
                      </Typography.Text>
                      <Typography.Text strong>{value}</Typography.Text>
                    </span>
                  ))}
                </Flex>
                <Flex align="center" gap={12} wrap>
                  <Flex align="center" gap={8}>
                    <Switch
                      aria-label={t('modules.purchasePickupList.freeGrouping')}
                      checked={activeDraft.groupingEnabled}
                      onChange={(groupingEnabled) =>
                        updateDraft((current) => ({
                          ...current,
                          groupingEnabled,
                        }))
                      }
                    />
                    <Typography.Text strong>
                      {t('modules.purchasePickupList.freeGrouping')}
                    </Typography.Text>
                  </Flex>
                  {activeDraft.groupingEnabled ? (
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() =>
                        updateDraft((current) => ({
                          ...current,
                          groups: [...current.groups, createPickupGroup()],
                        }))
                      }
                    >
                      {t('modules.purchasePickupList.addGroup')}
                    </Button>
                  ) : null}
                </Flex>
              </Flex>
              {data.warnings.length ? (
                <Alert
                  title={data.warnings.join('；')}
                  showIcon
                  type="warning"
                />
              ) : null}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
              >
                {activeDraft.groupingEnabled ? (
                  <div className="purchase-pickup-list-groups">
                    {activeDraft.groups.map((group, index) => (
                      <PickupDraftGroupSection
                        key={group.id}
                        columns={columns}
                        emptyText={t('modules.purchasePickupList.emptyGroup')}
                        group={group}
                        groupCount={activeDraft.groups.length}
                        index={index}
                        items={group.itemIds.flatMap((itemId) => {
                          const item = itemsById.get(itemId)
                          return item ? [item] : []
                        })}
                        onRemarkChange={setGroupRemark}
                        onRemove={removeGroup}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="purchase-pickup-list-flat">
                    <PickupItemsTable
                      columns={columns}
                      emptyText={t('modules.purchasePickupList.emptyGroup')}
                      items={flattenGroupItemIds(activeDraft.groups).flatMap(
                        (itemId) => {
                          const item = itemsById.get(itemId)
                          return item ? [item] : []
                        },
                      )}
                    />
                  </div>
                )}
              </DndContext>
            </>
          ) : null}
        </div>
      </Spin>
    </WorkspaceOverlay>
  )
}
