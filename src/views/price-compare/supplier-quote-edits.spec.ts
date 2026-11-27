import { describe, expect, it } from 'vitest'
import type { ColumnSavePlan, ServerCell } from './supplier-price-list-model'
import type { QuoteEditHistory } from './supplier-quote-edits'
import {
  applyEditHistoryToDrafts,
  countOverwrites,
  diffSavePlans,
  draftMapDirty,
  EMPTY_EDIT_HISTORY,
  parseDrafts,
  popRedoEntry,
  popUndoEntry,
  pruneEditHistoryForCollab,
  pushEditHistory,
  serializeDrafts,
} from './supplier-quote-edits'

const rowKey = '螺纹钢|HRB400|12|9米'
const rowKey2 = '螺纹钢|HRB400|14|9米'

const plan = (
  brandName: string,
  items: ColumnSavePlan['items'],
): ColumnSavePlan => ({
  brandName,
  column: null,
  items,
})

const cells = (entries: [string, number][] = []): Map<string, ServerCell> =>
  new Map(entries.map(([key, price]) => [key, { price }]))

describe('撤销/重做：绝对值操作日志', () => {
  it('自动保存清空草稿后，撤销仍写回旧值、重做写回新值', () => {
    const history = pushEditHistory(EMPTY_EDIT_HISTORY, {
      rest: [{ brandName: '中天', rowKey, before: 3280, after: 3300 }],
      collabListIds: [],
    })

    const undone = popUndoEntry(history)
    expect(undone.entry).not.toBeNull()
    // 模拟自动保存完成后草稿已被清空为 {}
    const afterUndo = applyEditHistoryToDrafts(
      {},
      undone.entry?.rest ?? [],
      'undo',
    )
    expect(afterUndo.drafts).toEqual({ 中天: { [rowKey]: 3280 } })
    expect(afterUndo.touchedBrands).toEqual(['中天'])

    const redone = popRedoEntry(undone.history)
    const afterRedo = applyEditHistoryToDrafts(
      {},
      redone.entry?.rest ?? [],
      'redo',
    )
    expect(afterRedo.drafts).toEqual({ 中天: { [rowKey]: 3300 } })
    expect(afterRedo.touchedBrands).toEqual(['中天'])
  })

  it('连续两步改价后自动保存，连撤两步回到最初值而不是跳回已保存新值', () => {
    let history = pushEditHistory(EMPTY_EDIT_HISTORY, {
      rest: [{ brandName: '中天', rowKey, before: 3280, after: 3290 }],
      collabListIds: [],
    })
    history = pushEditHistory(history, {
      rest: [{ brandName: '中天', rowKey, before: 3290, after: 3300 }],
      collabListIds: [],
    })

    const firstUndo = popUndoEntry(history)
    const step1 = applyEditHistoryToDrafts(
      {},
      firstUndo.entry?.rest ?? [],
      'undo',
    )
    expect(step1.drafts).toEqual({ 中天: { [rowKey]: 3290 } })

    const secondUndo = popUndoEntry(firstUndo.history)
    const step2 = applyEditHistoryToDrafts(
      step1.drafts,
      secondUndo.entry?.rest ?? [],
      'undo',
    )
    expect(step2.drafts).toEqual({ 中天: { [rowKey]: 3280 } })
  })

  it('空变化与同格首尾抵消不入栈，也不清空重做栈', () => {
    const seeded = popUndoEntry(
      pushEditHistory(EMPTY_EDIT_HISTORY, {
        rest: [{ brandName: '中天', rowKey, before: 3280, after: 3300 }],
        collabListIds: [],
      }),
    ).history
    expect(seeded.future).toHaveLength(1)

    const unchanged = pushEditHistory(seeded, {
      rest: [
        { brandName: '中天', rowKey, before: 3280, after: 3280 },
        { brandName: '中天', rowKey: rowKey2, before: 3100, after: 3200 },
        { brandName: '中天', rowKey: rowKey2, before: 3200, after: 3100 },
      ],
      collabListIds: [],
    })
    expect(unchanged).toBe(seeded)
    expect(unchanged.future).toHaveLength(1)
  })

  it('没有历史时撤销/重做返回 null，不改变栈状态', () => {
    expect(popUndoEntry(EMPTY_EDIT_HISTORY)).toEqual({
      history: EMPTY_EDIT_HISTORY,
      entry: null,
    })
    expect(popRedoEntry(EMPTY_EDIT_HISTORY)).toEqual({
      history: EMPTY_EDIT_HISTORY,
      entry: null,
    })
  })

  it('新的有效改动会清空重做栈，并按上限 50 截断历史栈', () => {
    let history: QuoteEditHistory = EMPTY_EDIT_HISTORY
    for (let index = 0; index < 60; index += 1) {
      history = pushEditHistory(history, {
        rest: [
          {
            brandName: '中天',
            rowKey,
            before: index,
            after: index + 1,
          },
        ],
        collabListIds: [],
      })
    }
    expect(history.past).toHaveLength(50)
    expect(history.past.at(-1)?.rest[0]).toEqual({
      brandName: '中天',
      rowKey,
      before: 59,
      after: 60,
    })

    const undone = popUndoEntry(history)
    expect(undone.history.future).toHaveLength(1)
    const pushed = pushEditHistory(undone.history, {
      rest: [],
      collabListIds: ['list-1', 'list-1'],
    })
    expect(pushed.future).toEqual([])
    expect(pushed.past.at(-1)?.collabListIds).toEqual(['list-1'])
  })

  it('shouldOmit 命中已落库原值时移除冗余草稿键，避免多余自动保存', () => {
    const applied = applyEditHistoryToDrafts(
      { 中天: { [rowKey]: 3300 } },
      [{ brandName: '中天', rowKey, before: 3280, after: 3300 }],
      'undo',
      {
        shouldOmit: (_brand, _key, value) => value === 3280,
      },
    )
    expect(applied.drafts).toEqual({})
    expect(applied.touchedBrands).toEqual(['中天'])
  })

  it('部分品牌进入协作后，仅剔除这些品牌的 REST 历史，保留未协作品牌与协作记录', () => {
    let history = pushEditHistory(EMPTY_EDIT_HISTORY, {
      rest: [{ brandName: '中天', rowKey, before: 3280, after: 3290 }],
      collabListIds: [],
    })
    history = pushEditHistory(history, {
      rest: [
        { brandName: '中天', rowKey, before: 3290, after: 3300 },
        { brandName: '永钢', rowKey, before: null, after: 3150 },
      ],
      collabListIds: ['list-shagang'],
    })

    const pruned = pruneEditHistoryForCollab(history, new Set(['中天']))
    expect(pruned.past).toEqual([
      {
        rest: [{ brandName: '永钢', rowKey, before: null, after: 3150 }],
        collabListIds: ['list-shagang'],
      },
    ])
  })
})

describe('草稿集合：判空与本地持久化', () => {
  it('空对象/空品牌都算无改动', () => {
    expect(draftMapDirty({})).toBe(false)
    expect(draftMapDirty({ 中天: {} })).toBe(false)
    expect(draftMapDirty({ 中天: { [rowKey]: null } })).toBe(true)
  })

  it('序列化后可还原（null=清空 与 数字都保留）', () => {
    const drafts = { 中天: { [rowKey]: 3280, other: null } }
    expect(parseDrafts(serializeDrafts(drafts))).toEqual(drafts)
  })

  it('脏数据退化为空，不让页面打不开', () => {
    expect(parseDrafts(null)).toEqual({})
    expect(parseDrafts('not-json')).toEqual({})
    expect(parseDrafts('[]')).toEqual({})
    expect(parseDrafts('{"中天":"oops","永钢":{"a":1,"b":"x"}}')).toEqual({
      永钢: { a: 1 },
    })
  })
})

describe('保存前差异统计', () => {
  it('区分新增 / 改价 / 取消', () => {
    const diff = diffSavePlans(
      [
        plan('中天', [
          {
            category: '螺纹钢',
            material: 'HRB400',
            spec: 12,
            length: '9米',
            price: 3300,
          },
        ]),
      ],
      () =>
        cells([
          [rowKey, 3280],
          ['螺纹钢|HRB400|14|9米', 3400],
        ]),
    )
    // 3280 → 3300 是改价；14 那条没提交 = 取消
    expect(diff).toEqual({ added: 0, changed: 1, removed: 1, brands: 1 })
  })

  it('新列的全部条目都算新增', () => {
    const diff = diffSavePlans(
      [
        plan('永钢', [
          {
            category: '螺纹钢',
            material: 'HRB400',
            spec: 12,
            length: '9米',
            price: 3150,
          },
        ]),
      ],
      () => cells(),
    )
    expect(diff).toEqual({ added: 1, changed: 0, removed: 0, brands: 1 })
  })
})

describe('粘贴预检：覆盖已有值的格数', () => {
  it('服务端已有价或本次草稿已有值都算覆盖', () => {
    const server = new Map<string, ServerCell>([[rowKey, { price: 3280 }]])
    const count = countOverwrites({
      cells: [
        { brandName: '中天', rowKey, value: 3290 },
        { brandName: '中天', rowKey: 'another', value: 3290 },
        { brandName: '永钢', rowKey: 'draft-only', value: 1 },
      ],
      drafts: { 永钢: { 'draft-only': 3000 } },
      serverCellsOfBrand: (brand) => (brand === '中天' ? server : new Map()),
    })
    expect(count).toBe(2)
  })
})
