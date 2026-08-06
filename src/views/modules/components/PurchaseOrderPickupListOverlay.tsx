import {
  ApartmentOutlined,
  DeleteOutlined,
  HolderOutlined,
  LockOutlined,
  PlusOutlined,
  UndoOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import type {
  CollisionDetection,
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
import type { TableColumnsType, TableProps } from 'antd'
import {
  Alert,
  Button,
  Flex,
  Input,
  Spin,
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
import { ResizableHeaderCell } from '@/components/table/ResizableHeaderCell'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import type { EntityId } from '@/types/entity-id'
import { formatWeight } from '@/utils/formatters'
import { sumColumnWidths } from '@/views/modules/components/business-grid-table-utils'
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
        title: t('modules.columns.warehouseName'),
        dataIndex: 'warehouseName',
        width: 112,
        align: 'center',
        render: (value: string | null) => displayText(value),
      },
      {
        title: t('modules.columns.brand'),
        dataIndex: 'brand',
        width: 80,
        align: 'center',
        ellipsis: true,
      },
      {
        title: t('modules.purchasePickupList.itemName'),
        dataIndex: 'category',
        width: 80,
        align: 'center',
        ellipsis: true,
      },
      {
        title: t('modules.columns.material'),
        dataIndex: 'material',
        width: 80,
        align: 'center',
        ellipsis: true,
      },
      {
        title: t('modules.columns.spec'),
        dataIndex: 'spec',
        width: 96,
        align: 'center',
        ellipsis: true,
      },
      {
        title: t('modules.columns.length'),
        dataIndex: 'length',
        width: 64,
        align: 'center',
        render: (value: string | null) => displayText(value),
      },
      {
        title: t('modules.purchasePickupList.pickupQuantity'),
        dataIndex: 'pickupQuantity',
        width: 72,
        align: 'center',
      },
      {
        title: t('modules.purchasePickupList.pieceWeight'),
        dataIndex: 'pieceWeightTon',
        width: 96,
        align: 'center',
        render: (value: number) => formatWeight(value),
      },
      {
        title: t('modules.purchasePickupList.pickupWeight'),
        dataIndex: 'pickupWeightTon',
        width: 96,
        align: 'center',
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
  } = useSortable({
    id: props['data-row-key'],
    data: { type: ITEM_DRAG_TYPE },
  })
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
  locked: boolean
  remark: string
  itemIds: string[]
}

interface PickupListDraft {
  dataKey: string
  groups: PickupDraftGroup[]
}

interface PickupItemsTableProps {
  columns: TableColumnsType<PurchaseOrderPickupListItem>
  components: TableProps<PurchaseOrderPickupListItem>['components']
  emptyText: string
  items: PurchaseOrderPickupListItem[]
}

interface PickupDraftGroupSectionProps extends PickupItemsTableProps {
  group: PickupDraftGroup
  groupCount: number
  index: number
  onLockedChange: (groupId: string, locked: boolean) => void
  onRemarkChange: (groupId: string, remark: string) => void
  onRemove: (groupId: string) => void
}

const DEFAULT_GROUP_ID = 'pickup-group-default'
const GROUP_DRAG_PREFIX = 'pickup-group:'
const GROUP_DRAG_TYPE = 'pickup-group'
const ITEM_DRAG_TYPE = 'pickup-item'
const WAREHOUSE_NAME_COLLATOR = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
})
const MATERIAL_TEXT_COLLATOR = new Intl.Collator('zh-CN', {
  sensitivity: 'base',
})
let nextPickupGroupId = 0

const pickupListCollisionDetection: CollisionDetection = (args) => {
  if (args.active.data.current?.type !== GROUP_DRAG_TYPE) {
    return closestCenter(args)
  }

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.data.current?.type === GROUP_DRAG_TYPE,
    ),
  })
}

function groupDragId(groupId: string) {
  return `${GROUP_DRAG_PREFIX}${groupId}`
}

function groupIdFromDragId(dragId: string) {
  return dragId.startsWith(GROUP_DRAG_PREFIX)
    ? dragId.slice(GROUP_DRAG_PREFIX.length)
    : undefined
}

function createPickupGroup(itemIds: string[] = []): PickupDraftGroup {
  nextPickupGroupId += 1
  return {
    id: `pickup-group-${nextPickupGroupId}`,
    locked: false,
    remark: '',
    itemIds,
  }
}

function warehouseGroupKey(item: PurchaseOrderPickupListItem) {
  const warehouseId = item.warehouseId?.trim()
  if (warehouseId) return `id:${warehouseId}`

  const warehouseName = item.warehouseName?.trim()
  return warehouseName ? `name:${warehouseName}` : 'unassigned'
}

function numericSortValue(value: string, ignoredCharacters: RegExp) {
  const numericText = value.replace(ignoredCharacters, '')
  if (!numericText) return undefined

  const numericValue = Number(numericText)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function compareNullableNumbers(left?: number, right?: number) {
  if (left === right) return 0
  if (left === undefined) return 1
  if (right === undefined) return -1
  return left - right
}

function compareByMaterialCatalogOrder(
  left: PurchaseOrderPickupListItem,
  right: PurchaseOrderPickupListItem,
) {
  // Mirrors MaterialSearchPolicy.DEFAULT_SORT and its generated numeric columns.
  return (
    MATERIAL_TEXT_COLLATOR.compare(left.material, right.material) ||
    compareNullableNumbers(
      numericSortValue(left.length ?? '0', /[^0-9.]/g),
      numericSortValue(right.length ?? '0', /[^0-9.]/g),
    ) ||
    MATERIAL_TEXT_COLLATOR.compare(left.brand, right.brand) ||
    compareNullableNumbers(
      numericSortValue(left.spec, /[^0-9]/g),
      numericSortValue(right.spec, /[^0-9]/g),
    )
  )
}

function createWarehouseGroups(
  items: PurchaseOrderPickupListItem[],
): PickupDraftGroup[] {
  const buckets = new Map<
    string,
    {
      items: PurchaseOrderPickupListItem[]
      warehouseId: string
      warehouseName: string
    }
  >()
  for (const item of items) {
    const key = warehouseGroupKey(item)
    const warehouseName = item.warehouseName?.trim() || ''
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.items.push(item)
      if (!bucket.warehouseName && warehouseName) {
        bucket.warehouseName = warehouseName
      }
      continue
    }
    buckets.set(key, {
      items: [item],
      warehouseId: item.warehouseId?.trim() || '',
      warehouseName,
    })
  }

  return Array.from(buckets.values())
    .sort((left, right) => {
      if (Boolean(left.warehouseName) !== Boolean(right.warehouseName)) {
        return left.warehouseName ? -1 : 1
      }
      return (
        WAREHOUSE_NAME_COLLATOR.compare(
          left.warehouseName,
          right.warehouseName,
        ) ||
        WAREHOUSE_NAME_COLLATOR.compare(left.warehouseId, right.warehouseId)
      )
    })
    .map((bucket) =>
      createPickupGroup(
        bucket.items
          .toSorted(compareByMaterialCatalogOrder)
          .map((item) => item.itemId),
      ),
    )
}

function resolveWarehouseLabel(
  items: PurchaseOrderPickupListItem[],
  unassignedLabel: string,
) {
  if (!items.length) return undefined

  const warehouseKeys = new Set(items.map(warehouseGroupKey))
  if (warehouseKeys.size !== 1) return undefined

  const warehouseNames = new Set(
    items
      .map((item) => item.warehouseName?.trim())
      .filter((name): name is string => Boolean(name)),
  )
  if (warehouseNames.size > 1) return undefined
  return warehouseNames.values().next().value || unassignedLabel
}

function createDefaultDraft(
  dataKey: string,
  itemIds: string[],
): PickupListDraft {
  return {
    dataKey,
    groups: [
      {
        id: DEFAULT_GROUP_ID,
        locked: false,
        remark: '',
        itemIds: [...itemIds],
      },
    ],
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
    locked: group.locked ?? false,
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

function reorderGroupedItems(
  groups: PickupDraftGroup[],
  activeId: string,
  overId: string,
) {
  const sourceGroupIndex = groups.findIndex((group) =>
    group.itemIds.includes(activeId),
  )
  const targetGroupId = groupIdFromDragId(overId)
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
  if (groups[sourceGroupIndex].locked || groups[targetGroupIndex].locked) {
    return groups
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

function reorderGroups(
  groups: PickupDraftGroup[],
  activeId: string,
  overId: string,
) {
  const activeGroupId = groupIdFromDragId(activeId)
  const overGroupId = groupIdFromDragId(overId)
  if (!activeGroupId || !overGroupId) return groups

  const activeIndex = groups.findIndex((group) => group.id === activeGroupId)
  const overIndex = groups.findIndex((group) => group.id === overGroupId)
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return groups
  }
  return arrayMove(groups, activeIndex, overIndex)
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

function PickupDraftGroupSection({
  columns,
  components,
  emptyText,
  group,
  groupCount,
  index,
  items,
  onLockedChange,
  onRemarkChange,
  onRemove,
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

interface PickupListSummaryProps {
  canGroup: boolean
  canRestore: boolean
  summaryItems: Array<[string, string | number]>
  onAddGroup: () => void
  onClose: () => void
  onGroupByWarehouse: () => void
  onRestore: () => void
}

function PickupListSummary({
  canGroup,
  canRestore,
  summaryItems,
  onAddGroup,
  onClose,
  onGroupByWarehouse,
  onRestore,
}: PickupListSummaryProps) {
  const { t } = useTranslation()

  return (
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
          <span key={label} className="purchase-pickup-list-metric">
            <Typography.Text type="secondary">{label}：</Typography.Text>
            <Typography.Text strong>{value}</Typography.Text>
          </span>
        ))}
      </Flex>
      <Flex align="center" gap={12} wrap>
        <Button
          disabled={!canGroup}
          icon={<ApartmentOutlined />}
          onClick={onGroupByWarehouse}
        >
          {t('modules.purchasePickupList.groupByWarehouse')}
        </Button>
        <Button icon={<PlusOutlined />} onClick={onAddGroup}>
          {t('modules.purchasePickupList.addGroup')}
        </Button>
        <Button
          disabled={!canRestore}
          icon={<UndoOutlined />}
          onClick={onRestore}
        >
          {t('modules.purchasePickupList.restoreDefault')}
        </Button>
        <Button type="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </Flex>
    </Flex>
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
      (group) => group.locked || group.remark.length > 0,
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
                        onLockedChange={setGroupLocked}
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
