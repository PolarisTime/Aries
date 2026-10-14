// @vitest-environment node

import type {
  Active,
  ClientRect,
  CollisionDetection,
  DroppableContainer,
} from '@dnd-kit/core'
import { describe, expect, it } from 'vitest'
import { rowDragCollisionDetection } from './row-drag-collision'

/**
 * 变高行的落位判定: **行高不影响"落第几格"**。
 *
 * <p>明细表里"备注换行、拆分预览展开、带多个标签"的行天然比别的行高。dnd-kit 的
 * `closestCenter` 比的是"拖动项中心到各行中心的直线距离", 变高行下会晚一格或早一格
 * 落位(社区已知的坑), 因此落位判定改为按行序数"已越过的行数"。本组用例用
 * 20 / 100 / 20 这种极端高差锁定口径。</p>
 *
 * <p>回退验证(实际改错跑过): 把判定换回"拖动位移 ÷ 平均行高 再四舍五入取下标",
 * 下面「把末行上移 40px 不应移动」与「把首行下移 40px 不应移动」立即变红。</p>
 */
interface RowSpec {
  id: string
  top: number
  height: number
}

const ROWS: RowSpec[] = [
  { id: 'a', top: 0, height: 20 },
  { id: 'b', top: 20, height: 100 },
  { id: 'c', top: 120, height: 20 },
]

function clientRect(top: number, height: number): ClientRect {
  return {
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 200,
    width: 200,
  }
}

function rowRect(rows: RowSpec[], id: string): ClientRect {
  const row = rows.find((entry) => entry.id === id)
  if (!row) throw new Error(`未知行: ${id}`)
  return clientRect(row.top, row.height)
}

/** 构造 dnd-kit 碰撞检测的入参: 拖动项中心放在 `center`(绝对 y 坐标)。 */
function collisionArgs(
  rows: RowSpec[],
  activeId: string,
  center: number,
): Parameters<CollisionDetection>[0] {
  const containers: DroppableContainer[] = rows.map((row) => ({
    id: row.id,
    key: row.id,
    data: { current: {} },
    disabled: false,
    node: { current: null },
    rect: { current: null },
  }))
  const droppableRects = new Map(
    rows.map((row) => [row.id, clientRect(row.top, row.height)]),
  )
  const initial = rowRect(rows, activeId)
  const active: Active = {
    id: activeId,
    data: { current: {} },
    rect: { current: { initial, translated: null } },
  }
  const height = initial.height
  return {
    active,
    collisionRect: clientRect(center - height / 2, height),
    droppableRects,
    droppableContainers: containers,
    pointerCoordinates: null,
  }
}

/** 落位结果: 命中的行 id(即 arrayMove 的目标下标对应的行)。 */
function landedRowId(
  rows: RowSpec[],
  activeId: string,
  center: number,
): string {
  const collisions = rowDragCollisionDetection(
    collisionArgs(rows, activeId, center),
  )
  return String(collisions[0]?.id)
}

describe('行拖动落位判定(变高行)', () => {
  it('行首/行尾之外不越界: 拖动项停在原处时命中自己', () => {
    expect(landedRowId(ROWS, 'a', 10)).toBe('a')
    expect(landedRowId(ROWS, 'b', 70)).toBe('b')
    expect(landedRowId(ROWS, 'c', 130)).toBe('c')
  })

  it('把首行(20px)下移 40px: 中心还没越过中间行(100px)的中线, 不该落位', () => {
    // 首行中心 10 + 40 = 50, 中间行中线 = 20 + 50 = 70
    expect(landedRowId(ROWS, 'a', 50)).toBe('a')
    // 越过中线后才落到第 2 格
    expect(landedRowId(ROWS, 'a', 70)).toBe('b')
    // 越过末行中线(130)后落到最后
    expect(landedRowId(ROWS, 'a', 130)).toBe('c')
  })

  it('把末行(20px)上移 40px: 中心还没越过中间行(100px)的中线, 不该落位', () => {
    // 末行中心 130 - 40 = 90, 中间行中线 70 —— 90 仍在中间行下方
    expect(landedRowId(ROWS, 'c', 90)).toBe('c')
    // 越过中间行中线后落到第 2 格
    expect(landedRowId(ROWS, 'c', 70)).toBe('b')
    // 越过首行中线(10)之前一直停在第 2 格, 越过之后才到第 1 格
    expect(landedRowId(ROWS, 'c', 11)).toBe('b')
    expect(landedRowId(ROWS, 'c', 10)).toBe('a')
    expect(landedRowId(ROWS, 'c', 9)).toBe('a')
  })

  it('同一位置不会出现两个落点: 正好压在中线上时向下算越过、向上算未越过', () => {
    // 中间行中线 = 70
    expect(landedRowId(ROWS, 'a', 70)).toBe('b')
    // 从上往下压在中线: 落位不变(与"向上未越过"互为镜像)
    expect(landedRowId(ROWS, 'c', 70)).toBe('b')
  })

  it('变高行下落位与平均行高无关(平均 46.7px 的朴素算法会算错)', () => {
    const average = (20 + 100 + 20) / 3
    // 首行下移 40px: 朴素算法 round(40 / 46.7) = 1 → 会误判为"落到第 2 格"
    expect(Math.round(40 / average)).toBe(1)
    expect(landedRowId(ROWS, 'a', 50)).toBe('a')
    // 末行上移 40px: 朴素算法 round(-40 / 46.7) = -1 → 会误判为"落到第 2 格"
    expect(Math.round(-40 / average)).toBe(-1)
    expect(landedRowId(ROWS, 'c', 90)).toBe('c')
  })

  it('等高行仍按"越过中线即落位"(与改造前一致)', () => {
    const flat: RowSpec[] = [
      { id: 'a', top: 0, height: 40 },
      { id: 'b', top: 40, height: 40 },
      { id: 'c', top: 80, height: 40 },
    ]
    expect(landedRowId(flat, 'a', 20)).toBe('a')
    expect(landedRowId(flat, 'a', 60)).toBe('b')
    expect(landedRowId(flat, 'a', 100)).toBe('c')
    expect(landedRowId(flat, 'c', 60)).toBe('b')
    expect(landedRowId(flat, 'c', 21)).toBe('b')
    expect(landedRowId(flat, 'c', 20)).toBe('a')
    expect(landedRowId(flat, 'c', 19)).toBe('a')
  })
})
