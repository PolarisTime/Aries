import { describe, expect, it } from 'vitest'
import {
  COALESCE_MS,
  createSheetHistory,
  HISTORY_LIMIT,
  isSpecQuantityLocked,
  recordHistoryCommit,
  type SheetSnapshot,
  shouldCoalesceHistory,
  takeRedoSnapshot,
  takeUndoSnapshot,
} from './sheet-history'
import type { PriceSheet } from './types'

function makeSheet(overrides: Partial<PriceSheet> = {}): PriceSheet {
  return {
    id: 'sheet-1',
    name: '批次 1',
    status: '报价',
    projectId: 'project-1',
    projectName: '项目一',
    orderDate: '2026-10-31',
    refDate: '2026-10-31',
    refPeriod: '上午',
    lengthPremium: 0,
    inputs: {},
    rows: [],
    ...overrides,
  }
}

/** 用一个可区分的标记构造快照, 便于断言撤销/重做取到的是哪一个。 */
function snapshot(marker: string): SheetSnapshot {
  return {
    sheets: [makeSheet({ id: 'sheet-1', name: marker })],
    activeId: 'sheet-1',
    configs: {},
  }
}

describe('撤销/重做历史(sheet-history)', () => {
  it('同一 coalesceKey 在合并窗口内合并, 超出窗口或换键则各自成条', () => {
    const history = createSheetHistory()
    expect(shouldCoalesceHistory(history, 'ton:row-1', 1000)).toBe(false)
    // 首次没有 lastKey, 不合并
    expect(recordHistoryCommit(history, snapshot('a'), 'ton:row-1', 1000)).toBe(
      true,
    )
    expect(
      shouldCoalesceHistory(history, 'ton:row-1', 1000 + COALESCE_MS - 1),
    ).toBe(true)
    expect(recordHistoryCommit(history, snapshot('b'), 'ton:row-1', 1500)).toBe(
      false,
    )
    expect(history.past).toHaveLength(1)
    // 超过合并窗口
    expect(
      shouldCoalesceHistory(history, 'ton:row-1', 1500 + COALESCE_MS),
    ).toBe(false)
    // 窗口内但换了键
    expect(shouldCoalesceHistory(history, 'ton:row-2', 1600)).toBe(false)
    // 空键永不合并(离散操作)
    expect(shouldCoalesceHistory(history, undefined, 1600)).toBe(false)
  })

  it('新提交压栈并清空 redo; 历史上限生效', () => {
    const history = createSheetHistory()
    recordHistoryCommit(history, snapshot('s0'), 'k0', 1000)
    history.future = [snapshot('redo-1')]
    recordHistoryCommit(history, snapshot('s1'), 'k1', 2000)
    expect(history.past.map((item) => item.sheets[0].name)).toEqual([
      's0',
      's1',
    ])
    expect(history.future).toHaveLength(0)
    expect(history.lastKey).toBe('k1')
    expect(history.lastTime).toBe(2000)

    for (let index = 0; index < HISTORY_LIMIT + 10; index += 1) {
      recordHistoryCommit(
        history,
        snapshot(`n${index}`),
        `kn${index}`,
        3000 + index,
      )
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT)
    // 超限时丢弃最旧的条目, 保留最近的压栈顺序
    expect(history.past.at(-1)?.sheets[0].name).toBe(`n${HISTORY_LIMIT + 9}`)
  })

  it('撤销后当前快照进入 redo 栈, 重做再回到 past', () => {
    const history = createSheetHistory()
    const first = snapshot('first')
    const second = snapshot('second')
    recordHistoryCommit(history, first, 'k1', 1000)
    recordHistoryCommit(history, second, 'k2', 2000)

    const undone = takeUndoSnapshot(history, snapshot('current'))
    expect(undone).toBe(second)
    expect(history.past).toHaveLength(1)
    expect(history.future.map((item) => item.sheets[0].name)).toEqual([
      'current',
    ])

    const redone = takeRedoSnapshot(history, second)
    expect(redone?.sheets[0].name).toBe('current')
    expect(history.past.map((item) => item.sheets[0].name)).toEqual([
      'first',
      'second',
    ])
    expect(history.future).toHaveLength(0)
  })

  it('空历史时撤销/重做返回 undefined 且不改动历史', () => {
    const history = createSheetHistory()
    expect(takeUndoSnapshot(history, snapshot('current'))).toBeUndefined()
    expect(takeRedoSnapshot(history, snapshot('current'))).toBeUndefined()
    expect(history.past).toHaveLength(0)
    expect(history.future).toHaveLength(0)
  })

  it('redo 栈同样受 HISTORY_LIMIT 限制', () => {
    const history = createSheetHistory()
    history.future = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) =>
      snapshot(`f${index}`),
    )
    history.past = [snapshot('p')]
    takeUndoSnapshot(history, snapshot('current'))
    expect(history.future).toHaveLength(HISTORY_LIMIT)
  })

  it('规格数量锁定只看激活单据', () => {
    const active = makeSheet({ id: 'a' })
    const locked = makeSheet({ id: 'b', specQuantityLocked: true })
    expect(
      isSpecQuantityLocked({
        sheets: [active, locked],
        activeId: 'a',
        configs: {},
      }),
    ).toBe(false)
    expect(
      isSpecQuantityLocked({
        sheets: [active, locked],
        activeId: 'b',
        configs: {},
      }),
    ).toBe(true)
    expect(
      isSpecQuantityLocked({ sheets: [], activeId: 'x', configs: {} }),
    ).toBe(false)
  })
})
