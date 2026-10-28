import { describe, expect, it } from 'vitest'
import type { ColumnSavePlan, ServerCell } from './supplier-price-list-model'
import type { DraftHistory } from './supplier-quote-edits'
import {
  countOverwrites,
  diffSavePlans,
  draftMapDirty,
  parseDrafts,
  pushHistory,
  redoDrafts,
  serializeDrafts,
  undoDrafts,
} from './supplier-quote-edits'

const rowKey = '螺纹钢|HRB400|12|9米'

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

describe('撤销/重做：草稿快照', () => {
  it('每次改动入栈，撤销回到上一步，重做再回来', () => {
    const step0 = {}
    const step1 = { 中天: { [rowKey]: 3280 } }
    let history = pushHistory({ past: [], future: [] }, step0)
    const undone = undoDrafts(history, step1)
    expect(undone.drafts).toEqual(step0)
    history = undone.history
    const redone = redoDrafts(history, undone.drafts)
    expect(redone.drafts).toEqual(step1)
  })

  it('没有历史时撤销/重做是空操作（不会把草稿清空）', () => {
    const current = { 中天: { [rowKey]: 1 } }
    expect(undoDrafts({ past: [], future: [] }, current).drafts).toEqual(
      current,
    )
    expect(redoDrafts({ past: [], future: [] }, current).drafts).toEqual(
      current,
    )
  })

  it('新的改动会清空重做栈（标准撤销语义）', () => {
    const history = pushHistory(
      { past: [{}], future: [{ 中天: { [rowKey]: 9 } }] },
      { 中天: { [rowKey]: 1 } },
    )
    expect(history.future).toEqual([])
  })

  it('只把「历史栈」截断，不丢当前草稿', () => {
    let history: DraftHistory = { past: [], future: [] }
    for (let index = 0; index < 60; index += 1) {
      history = pushHistory(history, { 中天: { [rowKey]: index } })
    }
    expect(history.past.length).toBe(50)
    expect(history.past.at(-1)).toEqual({ 中天: { [rowKey]: 59 } })
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
