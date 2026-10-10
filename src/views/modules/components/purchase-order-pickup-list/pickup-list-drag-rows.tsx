import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MenuProps, TableColumnsType, TableProps } from 'antd'
import { Button, Input, Tag, Tooltip, Typography } from 'antd'
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  TouchEvent,
} from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContextMenu } from '@/components/ContextMenu'
import { formatWeight } from '@/utils/formatters'
import type { PickupDraftGroup, PickupListRow } from './pickup-list-draft'
import {
  GROUP_DRAG_TYPE,
  groupDragId,
  resolveWarehouseLabel,
} from './pickup-list-draft'
import { guard, type Listener } from './pickup-list-drag-activation'
import { PickupItemsTable } from './pickup-list-items-table'
import { preserveNativeContextMenuOnInputs } from './pickup-list-row-menu'

/** 分组菜单条目 key: 锁定/解除锁定二选一, 另有移除分组。 */
const GROUP_MENU_LOCK = 'lock'
const GROUP_MENU_UNLOCK = 'unlock'
const GROUP_MENU_REMOVE = 'remove'
const GROUP_MENU_MOVE_UP = 'moveUp'
const GROUP_MENU_MOVE_DOWN = 'moveDown'

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
  /** 上移/下移分组(顺序调整的非拖动替代)。 */
  onMoveGroup: (groupId: string, direction: 'up' | 'down') => void
  /** 上移/下移一行(顺序调整的非拖动替代)。 */
  onMoveRow: (row: PickupListRow, direction: 'up' | 'down') => void
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
  onMoveGroup,
  onMoveRow,
}: PickupDraftGroupSectionProps) {
  const { t } = useTranslation()
  const { listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
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
  /**
   * 分组头自身即拖动激活点(取消可见手柄后):
   * 鼠标按住拖动 / 触摸长按 / 键盘空格, 输入控件上放行。
   * 与明细行一致, 刻意不透传 dnd-kit 的 attributes(带 role="button")。
   */
  const dragListeners = useMemo(
    () => ({
      onPointerDown: guard(
        listeners?.onPointerDown as Listener<PointerEvent<HTMLDivElement>>,
      ),
      onTouchStart: guard(
        listeners?.onTouchStart as Listener<TouchEvent<HTMLDivElement>>,
      ),
      // 键盘手柄是标题区的 <button>; 指针/触摸激活点才是整个分组头
      onKeyDown: listeners?.onKeyDown as Listener<
        KeyboardEvent<HTMLButtonElement>
      >,
    }),
    [listeners],
  )
  /** 分组菜单受控开合: 键盘 Shift+F10 需要主动置开。 */
  const [menuOpen, setMenuOpen] = useState(false)
  const openMenuByKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    const isContextMenuKey =
      event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
    if (!isContextMenuKey) return
    event.preventDefault()
    setMenuOpen(true)
  }
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
  /** 分组头右键菜单: 条目与分组头按钮一一对应, 禁用口径复用同一条件。 */
  const groupMenuItems: MenuProps['items'] = [
    {
      key: group.locked ? GROUP_MENU_UNLOCK : GROUP_MENU_LOCK,
      label: lockLabel,
      icon: group.locked ? <LockOutlined /> : <UnlockOutlined />,
    },
    { type: 'divider' },
    {
      key: GROUP_MENU_MOVE_UP,
      label: t('modules.purchasePickupList.moveGroupUp'),
      icon: <ArrowUpOutlined />,
      disabled: index <= 0,
    },
    {
      key: GROUP_MENU_MOVE_DOWN,
      label: t('modules.purchasePickupList.moveGroupDown'),
      icon: <ArrowDownOutlined />,
      disabled: index >= groupCount - 1,
    },
    { type: 'divider' },
    {
      key: GROUP_MENU_REMOVE,
      label: removeLabel,
      icon: <DeleteOutlined />,
      danger: true,
      disabled: groupCount === 1,
    },
  ]
  const handleGroupMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === GROUP_MENU_LOCK || key === GROUP_MENU_UNLOCK) {
      onLockedChange(group.id, !group.locked)
      return
    }
    if (key === GROUP_MENU_MOVE_UP) {
      onMoveGroup(group.id, 'up')
      return
    }
    if (key === GROUP_MENU_MOVE_DOWN) {
      onMoveGroup(group.id, 'down')
      return
    }
    if (key === GROUP_MENU_REMOVE) {
      onRemove(group.id)
    }
  }

  return (
    <section
      ref={setNodeRef}
      className={`purchase-pickup-list-group${isOver ? ' purchase-pickup-list-group--drop-target' : ''}${isDragging ? ' purchase-pickup-list-group--dragging' : ''}`}
      style={style}
      // 包裹层: 捕获阶段放行输入控件(分组备注等), 右键菜单只挂在分组头上
      onContextMenuCapture={preserveNativeContextMenuOnInputs}
    >
      <ContextMenu
        ariaLabel={t('modules.purchasePickupList.groupContextMenuLabel', {
          index: index + 1,
        })}
        items={groupMenuItems}
        onClick={handleGroupMenuClick}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <div
          className="purchase-pickup-list-group-header"
          /*
           * 指针/触摸的拖动激活点覆盖整头(取消可见手柄后仍要好按);
           * 键盘可访问名与焦点另放在标题区: 非交互 div 既不能挂 aria-label,
           * 也不应带 tabIndex(biome a11y), 标题区才是语义上的“手柄”。
           */
          onPointerDown={dragListeners.onPointerDown}
          onTouchStart={dragListeners.onTouchStart}
        >
          {/* 用真实 button 承载键盘手柄: 可访问名、Tab 序与 Space 激活都是原生语义,
              在 div 上补 role 会被 antd lint 的 useSemanticElements 拒绝。
              标题区不含交互元素, 放在 button 内是合法内容。 */}
          <button
            type="button"
            className="purchase-pickup-list-group-title"
            aria-keyshortcuts="Space Shift+F10"
            aria-label={dragLabel}
            onKeyDown={(event) => {
              dragListeners.onKeyDown?.(event)
              openMenuByKeyboard(event)
            }}
          >
            <Typography.Text strong>
              {t('modules.purchasePickupList.groupLabel', {
                index: index + 1,
              })}
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
          </button>
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
      </ContextMenu>
      <PickupItemsTable
        columns={columns}
        components={components}
        emptyText={emptyText}
        rows={rows}
        onMerge={onMerge}
        onQuantityChange={onQuantityChange}
        onRemovePart={onRemovePart}
        onMoveRow={onMoveRow}
        onSplit={onSplit}
      />
    </section>
  )
}
