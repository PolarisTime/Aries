// @vitest-environment jsdom

import type { TFunction } from 'i18next'
import i18n from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import { rowDragKeyboardModelLabels } from '@/components/table/row-drag'
import { groupDragId, type PickupListRow } from './pickup-list-draft'
import {
  buildPickupListDragAccessibility,
  pickupListRowName,
} from './pickup-list-drag-a11y'

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key, options)
const tf = t as unknown as TFunction

const SNOWFLAKE_A = '1834671234567890123'
const SNOWFLAKE_B = '1834671234567890456'

function buildItem(
  overrides: Partial<PurchaseOrderPickupListItem> = {},
): PurchaseOrderPickupListItem {
  return {
    itemId: SNOWFLAKE_A,
    orderId: '1',
    orderNo: 'PO-1',
    lineNo: 1,
    warehouseId: 'w1',
    warehouseName: '一号仓',
    brand: '品牌',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9',
    pickupQuantity: 2,
    pieceWeightTon: 0.1,
    pickupWeightTon: 0.2,
    ...overrides,
  }
}

function buildRow(overrides: Partial<PickupListRow> = {}): PickupListRow {
  const item = overrides.item ?? buildItem()
  return {
    rowId: item.itemId,
    baseItemId: item.itemId,
    item,
    quantity: item.pickupQuantity,
    weightTon: item.pickupWeightTon,
    partIndex: 0,
    partCount: 1,
    ...overrides,
  }
}

/**
 * 提货单弹层 `DndContext` 的读屏产物: 分组与明细行共用同一个上下文, 播报必须
 * 分得清"哪个分组 / 哪一行物料", 且**绝不把行实例 id 读出来**。
 *
 * <p>回退验证(实际改错跑过): 去掉 Overlay 上的 `accessibility` 覆写、或把播报里的
 * 行名换成 `rowId`, 本组用例立即变红。</p>
 */
describe('提货单拖动读屏产物', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-CN')
  })

  const rows = [
    buildRow(),
    buildRow({
      rowId: `${SNOWFLAKE_A}#1`,
      partIndex: 1,
      partCount: 2,
      item: buildItem(),
    }),
    buildRow({
      rowId: SNOWFLAKE_B,
      item: buildItem({ itemId: SNOWFLAKE_B, category: '盘螺' }),
    }),
  ]

  const build = () =>
    buildPickupListDragAccessibility({
      groupIds: ['g1', 'g2'],
      rows,
      t: tf,
    })

  it('行名 = 品名 + 材质 + 规格 + 份次', () => {
    expect(pickupListRowName(rows[0], tf)).toBe('螺纹钢 HRB400E 12')
    expect(pickupListRowName(rows[1], tf)).toBe('螺纹钢 HRB400E 12 第 2/2 份')
  })

  it('分组播报按分组序号, 不播报分组 id', () => {
    const { announcements } = build()
    const start = announcements.onDragStart?.({
      active: { id: groupDragId('g2') },
    } as never)
    expect(start).toContain('分组 2')
    expect(start).not.toContain('g2')
  })

  it('明细行播报物料名与行号, 全程不含行实例 id 与雪花 id', () => {
    const { announcements, screenReaderInstructions } = build()
    const start = announcements.onDragStart?.({
      active: { id: SNOWFLAKE_A },
    } as never)
    expect(start).toContain('螺纹钢 HRB400E 12（第 1 行）')

    const over = announcements.onDragOver?.({
      active: { id: SNOWFLAKE_A },
      over: { id: SNOWFLAKE_B },
    } as never)
    expect(over).toContain('第 3 位')

    const end = announcements.onDragEnd?.({
      active: { id: SNOWFLAKE_B },
      over: { id: SNOWFLAKE_A },
    } as never)
    expect(end).toContain('盘螺 HRB400E 12（第 3 行）')

    const cancel = announcements.onDragCancel?.({
      active: { id: groupDragId('g1') },
    } as never)
    expect(cancel).toContain('分组 1')

    const spoken = [
      start,
      over,
      end,
      cancel,
      screenReaderInstructions.draggable,
    ].join(' | ')
    for (const id of [SNOWFLAKE_A, SNOWFLAKE_B, `${SNOWFLAKE_A}#1`]) {
      expect(spoken).not.toContain(id)
    }
    expect(screenReaderInstructions.draggable).not.toMatch(
      /Picked up|Draggable/,
    )
  })

  it('定位不到的行/分组播报固定文案, 不播报 id 也不出现「第 0 行」', () => {
    const { announcements } = build()
    const unknownRow = announcements.onDragStart?.({
      active: { id: '1834671234567890999' },
    } as never)
    expect(unknownRow).toBe('已拾起该明细行，用方向键移动，再按拾起键放下')

    const unknownGroup = announcements.onDragStart?.({
      active: { id: groupDragId('不存在') },
    } as never)
    expect(unknownGroup).toContain('当前分组')
  })

  it('操作说明由共享键位模型插值(与其它表面同一份文案)', () => {
    const { screenReaderInstructions } = build()
    const { pickUp, move, cancel } = rowDragKeyboardModelLabels()
    expect(screenReaderInstructions.draggable).toContain(pickUp)
    expect(screenReaderInstructions.draggable).toContain(move)
    expect(screenReaderInstructions.draggable).toContain(cancel)
  })
})
