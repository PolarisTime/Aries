import type { Announcements } from '@dnd-kit/core'
import type { TFunction } from 'i18next'
import {
  type RowDragAccessibility,
  rowDragDirectMoveHintText,
  rowDragKeyboardModelLabels,
  rowPositionOf,
} from '@/components/table/row-drag'
import { groupIdFromDragId, type PickupListRow } from './pickup-list-draft'

/** 明细行的可读名: 品名 + 材质 + 规格 + 份次; 全都缺失时给固定文案, 绝不回退成 id。 */
export function pickupListRowName(row: PickupListRow, t: TFunction): string {
  const base = [row.item.category, row.item.material, row.item.spec]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
  const name = base || t('modules.purchasePickupList.dragUnknownRow')
  if (row.partCount <= 1) return name
  return `${name} ${t('modules.purchasePickupList.splitPartLabel', {
    index: row.partIndex + 1,
    total: row.partCount,
  })}`
}

export interface PickupDragAccessibilityInput {
  /** 分组顺序(id 顺序)。 */
  groupIds: string[]
  /** 摊平后的行顺序(与渲染顺序一致)。 */
  rows: PickupListRow[]
  t: TFunction
}

/**
 * 提货清单弹层 `DndContext` 的读屏产物。
 *
 * <p>同一个 `DndContext` 里既有分组也有明细行, 因此播报要先看 id 是不是分组 id
 * (`groupDragId` 前缀), 再按「分组第 N 个」或「物料名 + 第 N 行」播报 ——
 * **任何回调都不会把行实例 id / 雪花 id 读出来**。行号走
 * {@link rowPositionOf} 兜底: `indexOf` 为 -1 时给固定文案而不是「第 0 行」。</p>
 */
export function buildPickupListDragAccessibility({
  groupIds,
  rows,
  t,
}: PickupDragAccessibilityInput): RowDragAccessibility {
  const rowIds = rows.map((row) => row.rowId)
  const rowById = new Map(rows.map((row) => [row.rowId, row]))

  const groupLabel = (groupId: string): string => {
    const index = groupIds.indexOf(groupId)
    return index < 0
      ? t('modules.purchasePickupList.dragUnknownGroup')
      : t('modules.purchasePickupList.groupLabel', { index: index + 1 })
  }

  const labelOf = (id: unknown): string => {
    const raw = String(id ?? '')
    const groupId = groupIdFromDragId(raw)
    if (groupId !== undefined) return groupLabel(groupId)
    const row = rowById.get(raw)
    const number = rowPositionOf(raw, rowIds)
    if (!row || number === undefined) {
      return t('modules.purchasePickupList.dragUnknownRow')
    }
    return t('common.rowDragSort.rowWithName', {
      index: number,
      name: pickupListRowName(row, t),
    })
  }

  const positionOf = (id: unknown): number | undefined => {
    const raw = String(id ?? '')
    const groupId = groupIdFromDragId(raw)
    if (groupId === undefined) return rowPositionOf(raw, rowIds)
    const index = groupIds.indexOf(groupId)
    return index < 0 ? undefined : index + 1
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      t('common.rowDragSort.dragStart', { row: labelOf(active.id) }),
    onDragOver: ({ active, over }) => {
      if (!over || over.id === active.id) return undefined
      const position = positionOf(over.id)
      if (position === undefined) return undefined
      return t('common.rowDragSort.dragOver', {
        row: labelOf(active.id),
        position,
      })
    },
    onDragEnd: ({ active, over }) => {
      const position =
        over && over.id !== active.id ? positionOf(over.id) : undefined
      if (position === undefined) {
        return t('common.rowDragSort.dragDropped', { row: labelOf(active.id) })
      }
      return t('common.rowDragSort.dragDroppedAt', {
        row: labelOf(active.id),
        position,
      })
    },
    onDragCancel: ({ active }) =>
      t('common.rowDragSort.dragCancel', { row: labelOf(active.id) }),
  }

  return {
    announcements,
    screenReaderInstructions: {
      draggable: t('common.rowDragSort.screenReaderInstructions', {
        ...rowDragKeyboardModelLabels(),
        direct: rowDragDirectMoveHintText(),
      }),
    },
  }
}
