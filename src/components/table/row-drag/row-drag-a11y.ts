import type { Announcements } from '@dnd-kit/core'
import type { TFunction } from 'i18next'
import {
  resolveRowNumber,
  rowDragDirectMoveHintText,
  rowDragKeyboardModelLabels,
} from './row-drag-config'

/**
 * 行拖动排序的**读屏产物**(纯逻辑, 与 React 无关, 便于直接单测)。
 *
 * <p>dnd-kit 的默认文案是英文, 而且播报里带 19 位雪花 id(「Picked up draggable item
 * 1834...」)。用户既听不懂, 也无法把播报对回「哪一行物料、现在第几位」。因此每个
 * `DndContext` 都必须覆写这两项:</p>
 * <ol>
 *   <li>{@link RowDragAccessibility.screenReaderInstructions}: 中文操作说明(拾起/移动/放下/
 *       取消, 由键位模型的同一份常量插值);</li>
 *   <li>{@link RowDragAccessibility.announcements}: 只播报「行名 + 序号 + 目标位次」,
 *       **任何回调都不把 id 读出来**。</li>
 * </ol>
 */
export interface RowDragAccessibility {
  announcements: Announcements
  screenReaderInstructions: { draggable: string }
}

/** 行名提供者: 返回该行的可读名(物料名等); 拿不到时返回空, 由默认「第 N 行」兜底。 */
export type RowDragDescribeRow = (
  rowId: string,
  /** 该行在有序集合里的下标(0 起); 定位不到时为 -1。 */
  index: number,
) => string | undefined

export interface RowDragLabelOptions {
  /** 行的 id 顺序(行模型的权威顺序)。 */
  rowIds: readonly string[]
  describeRow?: RowDragDescribeRow
  t: TFunction
}

/**
 * 行的可访问名: **物料名 + 序号**, 定位不到时给固定文案。
 *
 * <p>这里刻意不做 `rowIds.indexOf(id) + 1`: 明细不在有序集合里时 `indexOf` 返回 -1,
 * 直接 `+1` 会得到 0 —— 序号列显示「0」, 可访问名读成「第 0 行」。行号统一走
 * {@link resolveRowNumber} 逐级兜底, 真的定位不到就播报
 * `common.rowDragSort.unknownRow`, **绝不回退成 id**。</p>
 */
export function describeRowDragRow(
  rowId: string,
  { rowIds, describeRow, t }: RowDragLabelOptions,
): string {
  const index = rowIds.indexOf(rowId)
  const rowNumber = resolveRowNumber(rowIds, rowId)
  if (rowNumber === undefined) return t('common.rowDragSort.unknownRow')
  const name =
    index >= 0 ? describeRow?.(rowId, index)?.trim() || undefined : undefined
  return name
    ? t('common.rowDragSort.rowWithName', { index: rowNumber, name })
    : t('common.rowDragSort.rowLabel', { index: rowNumber })
}

/** 该行当前位次(1 起); 定位不到返回 undefined(调用方据此换一条不提位次的播报)。 */
export function rowPositionOf(
  rowId: string,
  rowIds: readonly string[],
): number | undefined {
  return resolveRowNumber(rowIds, rowId)
}

/**
 * 组装 `DndContext` 的 `accessibility`: 中文操作说明 + 只含「行名 + 位次」的播报器。
 */
export function buildRowDragAccessibility({
  rowIds,
  describeRow,
  t,
}: RowDragLabelOptions): RowDragAccessibility {
  const labelOf = (id: unknown) =>
    describeRowDragRow(String(id ?? ''), { rowIds, describeRow, t })
  const positionOf = (id: unknown) => rowPositionOf(String(id ?? ''), rowIds)

  return {
    screenReaderInstructions: {
      draggable: t('common.rowDragSort.screenReaderInstructions', {
        ...rowDragKeyboardModelLabels(),
        direct: rowDragDirectMoveHintText(),
      }),
    },
    announcements: {
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
        if (!over || over.id === active.id) {
          return t('common.rowDragSort.dragDropped', {
            row: labelOf(active.id),
          })
        }
        const position = positionOf(over.id)
        if (position === undefined) {
          return t('common.rowDragSort.dragDropped', {
            row: labelOf(active.id),
          })
        }
        return t('common.rowDragSort.dragDroppedAt', {
          row: labelOf(active.id),
          position,
        })
      },
      onDragCancel: ({ active }) =>
        t('common.rowDragSort.dragCancel', { row: labelOf(active.id) }),
    },
  }
}
