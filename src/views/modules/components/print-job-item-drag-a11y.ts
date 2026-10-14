import type { Announcements } from '@dnd-kit/core'
import type { TFunction } from 'i18next'
import type { PrintRecordItem } from '@/api/system/print-template'
import {
  rowDragDirectMoveHintText,
  rowDragKeyboardModelLabels,
} from '@/components/table/row-drag'

/**
 * 打印作业明细拖动排序的无障碍产物(纯逻辑, 与 React 无关, 便于直接单测)。
 *
 * <p>明细区的 `DndContext` 以前既没有覆写 `screenReaderInstructions`, 也没有覆写
 * `announcements`, 于是读屏用户听到的是 dnd-kit 的英文默认文案, 并且播报里带的是
 * 19 位雪花 id(「Picked up draggable item 1834...」)。用户无法把播报对回
 * 「哪一行物料、第几位」, 等于没有反馈。这里把两件事一次性补齐:</p>
 * <ol>
 *   <li>{@link PrintJobDragAccessibility.screenReaderInstructions}: 中文操作说明
 *       (含键盘与鼠标两条路径);</li>
 *   <li>{@link PrintJobDragAccessibility.announcements}: 只播报
 *       「第 N 行 + 类别/材质/规格」与目标位次 —— **任何回调都不把 id 读出来**。</li>
 * </ol>
 */
export interface PrintJobDragAccessibility {
  announcements: Announcements
  screenReaderInstructions: { draggable: string }
}

/**
 * 明细行号(从 1 起算)。
 *
 * <p>行号只认 `orderedPrintItemIds` 里的位次; 明细不在其中时 `indexOf` 返回 -1,
 * 直接 `+1` 会得到 0 —— 序号列会显示「0」, 拖动按钮的可访问名会变成「拖动第 0 行打印明细」。
 * 这里按「有序位次 → 明细原始位次 → 表格行号」逐级兜底, 结果恒 ≥ 1。</p>
 */
export function resolvePrintItemRowNumber(
  orderedPrintItemIds: string[],
  printItems: PrintRecordItem[],
  itemId: string,
  tableRowIndex: number,
): number {
  const orderedIndex = orderedPrintItemIds.indexOf(itemId)
  if (orderedIndex >= 0) return orderedIndex + 1
  const sourceIndex = printItems.findIndex((item) => item.id === itemId)
  if (sourceIndex >= 0) return sourceIndex + 1
  return tableRowIndex >= 0 ? tableRowIndex + 1 : 1
}

/** 行名(类别/材质/规格); 全部缺失时给固定文案, 绝不回退成 id。 */
export function printItemRowName(
  item: PrintRecordItem | undefined,
  t: TFunction,
): string {
  const name = [item?.category, item?.material, item?.spec]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
  return name || t('modules.print.dragAnnounceUnknownRow')
}

/**
 * 拖动排序的播报器与操作说明: 播报内容只含行号、物料名与位次。
 *
 * <p>`fallbackItems` 是**行号兜底**: 明细不在有序集合里时 `indexOf` 返回 -1, 直接 +1 会得到
 * 0(读成「第 0 行」)。这里退回明细原始位次, 仍定位不到才播报「该明细行」——
 * 任何回调都不会把雪花 id 读出来。</p>
 */
export function buildPrintJobDragAccessibility(
  orderedPrintItems: PrintRecordItem[],
  t: TFunction,
  fallbackItems: PrintRecordItem[] = [],
): PrintJobDragAccessibility {
  const indexOf = (id: unknown) =>
    orderedPrintItems.findIndex((item) => item.id === String(id ?? ''))

  const rowNumber = (id: unknown): number | undefined => {
    const index = indexOf(id)
    if (index >= 0) return index + 1
    const fallbackIndex = fallbackItems.findIndex(
      (item) => item.id === String(id ?? ''),
    )
    return fallbackIndex >= 0 ? fallbackIndex + 1 : undefined
  }

  const rowLabel = (id: unknown): string => {
    const index = indexOf(id)
    const number = rowNumber(id)
    if (number === undefined) return t('modules.print.dragAnnounceUnknownRow')
    return t('modules.print.dragAnnounceRow', {
      index: number,
      name: printItemRowName(
        index >= 0 ? orderedPrintItems[index] : undefined,
        t,
      ),
    })
  }

  const positionOf = (id: unknown): number | undefined => rowNumber(id)

  return {
    screenReaderInstructions: {
      draggable: t('modules.print.dragScreenReaderInstructions', {
        ...rowDragKeyboardModelLabels(),
        direct: rowDragDirectMoveHintText(),
      }),
    },
    announcements: {
      onDragStart: ({ active }) =>
        t('modules.print.dragAnnounceStart', { row: rowLabel(active.id) }),
      onDragOver: ({ active, over }) => {
        const position = over ? positionOf(over.id) : undefined
        if (position === undefined) return undefined
        return t('modules.print.dragAnnounceOver', {
          row: rowLabel(active.id),
          position,
        })
      },
      onDragEnd: ({ active, over }) => {
        const position = over ? positionOf(over.id) : undefined
        if (position === undefined) {
          return t('modules.print.dragAnnounceDropped', {
            row: rowLabel(active.id),
          })
        }
        return t('modules.print.dragAnnounceDroppedAt', {
          row: rowLabel(active.id),
          position,
        })
      },
      onDragCancel: ({ active }) =>
        t('modules.print.dragAnnounceCancel', { row: rowLabel(active.id) }),
    },
  }
}
