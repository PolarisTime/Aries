// @vitest-environment jsdom

import type { TFunction } from 'i18next'
import i18n from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import {
  buildRowDragAccessibility,
  describeRowDragRow,
  rowPositionOf,
} from './row-drag-a11y'
import {
  rowDragDirectMoveHintText,
  rowDragKeyboardModelLabels,
} from './row-drag-config'

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key, options)

const ROW_IDS = [
  '1834000000000000001',
  '1834000000000000002',
  '1834000000000000003',
]
const NAMES: Record<string, string> = {
  '1834000000000000001': '螺纹钢',
  '1834000000000000002': '盘螺',
  '1834000000000000003': '高线',
}

const describeRow = (rowId: string) => NAMES[rowId]

/**
 * 行拖动读屏产物: **只播报物料名 + 序号, 绝不播报雪花 id**。
 *
 * <p>回退验证(实际改错跑过): 把 `describeRowDragRow` 的返回值换成 `rowId`,
 * 下面所有 `not.toContain(雪花 id)` 断言立即变红; 去掉 `accessibility` 覆写后
 * dnd-kit 的默认英文文案同样会让这些断言变红。</p>
 */
describe('行拖动读屏产物', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-CN')
  })

  it('行名 = 物料名 + 序号', () => {
    expect(
      describeRowDragRow(ROW_IDS[0], {
        rowIds: ROW_IDS,
        describeRow,
        t: t as unknown as TFunction,
      }),
    ).toBe('螺纹钢（第 1 行）')
  })

  it('未给行名时退回「第 N 行」', () => {
    expect(
      describeRowDragRow(ROW_IDS[1], {
        rowIds: ROW_IDS,
        t: t as unknown as TFunction,
      }),
    ).toBe('第 2 行')
  })

  /**
   * `indexOf` 为 -1 的兜底: 行不在有序集合里时不能把 -1 + 1 = 0 当成行号,
   * 也不能把 id 当行名 —— 两种错法用户都会听到「第 0 行」或一串 19 位数。
   */
  it('行不在有序集合里(indexOf 为 -1): 给固定文案, 不出现「第 0 行」也不出现 id', () => {
    const unknown = '1834000000000000099'
    const label = describeRowDragRow(unknown, {
      rowIds: ROW_IDS,
      describeRow: (rowId) => NAMES[rowId],
      t: t as unknown as TFunction,
    })
    expect(label).toBe('当前行')
    expect(label).not.toContain('第 0 行')
    expect(label).not.toContain(unknown)
  })

  it('rowPositionOf: 定位不到返回 undefined(而不是 0)', () => {
    expect(rowPositionOf(ROW_IDS[2], ROW_IDS)).toBe(3)
    expect(rowPositionOf('不存在', ROW_IDS)).toBeUndefined()
  })

  it('播报中文且不含任何雪花 id(拾起/移动/放下/取消全路径)', () => {
    const { announcements, screenReaderInstructions } =
      buildRowDragAccessibility({
        rowIds: ROW_IDS,
        describeRow,
        t: t as unknown as TFunction,
      })

    const start = announcements.onDragStart?.({
      active: { id: ROW_IDS[0] },
    } as never)
    expect(start).toContain('螺纹钢（第 1 行）')

    const over = announcements.onDragOver?.({
      active: { id: ROW_IDS[0] },
      over: { id: ROW_IDS[2] },
    } as never)
    expect(over).toContain('第 3 位')

    const end = announcements.onDragEnd?.({
      active: { id: ROW_IDS[0] },
      over: { id: ROW_IDS[2] },
    } as never)
    expect(end).toContain('第 3 位')

    const dropped = announcements.onDragEnd?.({
      active: { id: ROW_IDS[0] },
      over: { id: ROW_IDS[0] },
    } as never)
    expect(dropped).toContain('顺序未变')

    const cancel = announcements.onDragCancel?.({
      active: { id: ROW_IDS[1] },
    } as never)
    expect(cancel).toContain('盘螺（第 2 行）')

    const spoken = [
      start,
      over,
      end,
      dropped,
      cancel,
      screenReaderInstructions.draggable,
    ].join(' | ')
    for (const id of ROW_IDS) {
      expect(spoken).not.toContain(id)
    }
    expect(screenReaderInstructions.draggable).not.toMatch(
      /Picked up|Draggable/,
    )
  })

  it('操作说明由键位模型的同一份常量插值(改模型即改文案)', () => {
    const { screenReaderInstructions } = buildRowDragAccessibility({
      rowIds: ROW_IDS,
      describeRow,
      t: t as unknown as TFunction,
    })
    const { pickUp, move, cancel } = rowDragKeyboardModelLabels()
    expect(screenReaderInstructions.draggable).toContain(pickUp)
    expect(screenReaderInstructions.draggable).toContain(move)
    expect(screenReaderInstructions.draggable).toContain(cancel)
    expect(screenReaderInstructions.draggable).toContain(
      rowDragDirectMoveHintText(),
    )
  })

  it('定位不到的拖动项播报固定文案, 不播报 id', () => {
    const { announcements } = buildRowDragAccessibility({
      rowIds: ROW_IDS,
      describeRow,
      t: t as unknown as TFunction,
    })
    const start = announcements.onDragStart?.({
      active: { id: '1834000000000000099' },
    } as never)
    expect(start).toBe('已拾起当前行，用方向键移动，再按拾起键放下')
    expect(start).not.toContain('1834000000000000099')
  })
})
