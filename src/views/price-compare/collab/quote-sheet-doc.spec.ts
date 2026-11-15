import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { COLLAB_LOCAL_ORIGIN, COLLAB_SEED_ORIGIN } from './collab-doc'
import {
  hasQuoteSheetItem,
  isQuoteSheetDocEmpty,
  observeQuoteSheetItems,
  type QuoteSheetItemChange,
  readQuoteSheetItem,
  readQuoteSheetMeta,
  seedMissingQuoteSheetItems,
  seedQuoteSheetItems,
  writeQuoteSheetItem,
  writeQuoteSheetMeta,
} from './quote-sheet-doc'

/**
 * 报单比价协作文档（只协作 ton/remark）。
 *
 * <p>锁住四件事：① 只写 ton/remark，价格/结构字段没有入口；② `null` 表示清空字段
 * （与"文档里没有这一行"可区分）；③ 两客户端并发改同一行 ton 会收敛；④ 观察必须能
 * 看到"改已有行"（嵌套 Y.Map 用 observeDeep）。</p>
 */

const rowId = (spec = 12) => `row-${spec}`

function syncBothWays(left: Y.Doc, right: Y.Doc) {
  Y.applyUpdate(right, Y.encodeStateAsUpdate(left))
  Y.applyUpdate(left, Y.encodeStateAsUpdate(right))
}

describe('quote-sheet-doc 读写', () => {
  it('写 ton/remark 后能读回；清空（null）删掉字段但保留该行', () => {
    const doc = new Y.Doc()
    writeQuoteSheetItem(doc, rowId(), { ton: 12.5, remark: '急单' })
    expect(readQuoteSheetItem(doc, rowId())).toEqual({
      ton: 12.5,
      remark: '急单',
    })

    writeQuoteSheetItem(doc, rowId(), { ton: null })
    expect(readQuoteSheetItem(doc, rowId())).toEqual({ remark: '急单' })
    expect(hasQuoteSheetItem(doc, rowId())).toBe(true)

    writeQuoteSheetItem(doc, rowId(), { remark: null })
    expect(readQuoteSheetItem(doc, rowId())).toEqual({})
  })

  it('文档里没有的行返回 null（调用方应回退本地/REST 值）', () => {
    const doc = new Y.Doc()
    expect(readQuoteSheetItem(doc, rowId(99))).toBeNull()
    expect(hasQuoteSheetItem(doc, rowId(99))).toBe(false)
  })

  it('只有 ton 的行与只有 remark 的行互不干扰', () => {
    const doc = new Y.Doc()
    writeQuoteSheetItem(doc, rowId(12), { ton: 8 })
    writeQuoteSheetItem(doc, rowId(14), { remark: '备注' })
    expect(readQuoteSheetItem(doc, rowId(12))).toEqual({ ton: 8 })
    expect(readQuoteSheetItem(doc, rowId(14))).toEqual({ remark: '备注' })
  })

  it('meta 读写：sheetId 原样往返', () => {
    const doc = new Y.Doc()
    writeQuoteSheetMeta(doc, { sheetId: '9007199254740995', version: 7 })
    expect(readQuoteSheetMeta(doc)).toEqual({
      sheetId: '9007199254740995',
      version: 7,
    })
  })

  it('空文档判定：只有写进行之后才算非空', () => {
    const doc = new Y.Doc()
    expect(isQuoteSheetDocEmpty(doc)).toBe(true)
    writeQuoteSheetMeta(doc, { sheetId: '1' })
    expect(isQuoteSheetDocEmpty(doc)).toBe(true)
    writeQuoteSheetItem(doc, rowId(), { ton: 1 })
    expect(isQuoteSheetDocEmpty(doc)).toBe(false)
  })
})

describe('quote-sheet-doc 播种', () => {
  it('播种只补缺失行，不覆盖房间里已有的值', () => {
    const doc = new Y.Doc()
    writeQuoteSheetItem(doc, rowId(12), { ton: 10 })
    seedQuoteSheetItems(doc, [
      [rowId(12), { ton: 99 }],
      [rowId(14), { ton: 20, remark: '新行' }],
    ])
    expect(readQuoteSheetItem(doc, rowId(12))).toEqual({ ton: 10 })
    expect(readQuoteSheetItem(doc, rowId(14))).toEqual({
      ton: 20,
      remark: '新行',
    })
  })

  it('增行后只补文档里还没有的行（结构变更走 REST，文档不自动出现新行）', () => {
    const doc = new Y.Doc()
    writeQuoteSheetItem(doc, rowId(12), { ton: 10 })
    seedMissingQuoteSheetItems(doc, [
      [rowId(12), { ton: 10 }],
      [rowId(20), { ton: 30 }],
    ])
    expect(readQuoteSheetItem(doc, rowId(12))).toEqual({ ton: 10 })
    expect(readQuoteSheetItem(doc, rowId(20))).toEqual({ ton: 30 })
  })
})

describe('quote-sheet-doc 变化观察', () => {
  it('改已有行的 ton 也会被观察到，且本地/远端/播种可区分', () => {
    const doc = new Y.Doc()
    writeQuoteSheetItem(doc, rowId(), { ton: 10 })
    /*
     * 远端文档先同步一次基线：真实流程里两端在同一个房间、行已存在，才可能并发编辑
     * 同一个内层 Y.Map。若让两个文档各自**新建**同一个 key 的内层 map，Yjs 只能二选一
     * （客户端 id 随机，谁赢不确定）—— 那是"同一行在文档里还不存在"的场景，
     * 由首同步播种规则保证不会发生。
     */
    const remote = new Y.Doc()
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc))
    const seen: QuoteSheetItemChange[] = []
    const stop = observeQuoteSheetItems(doc, (changes) => {
      seen.push(...changes)
    })

    // 本地：改已有行（内层 Y.Map 变更，必须 observeDeep 才看得到）
    writeQuoteSheetItem(doc, rowId(), { ton: 12 })
    // 远端：同一内层 map 上并发写入（ton 由 CRDT 定序决定，remark 必然保留）
    writeQuoteSheetItem(remote, rowId(), { ton: 13, remark: '远端' })
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote), 'provider')
    // 播种：结构变更后补行
    seedMissingQuoteSheetItems(doc, [[rowId(20), { ton: 30 }]])

    const [localChange, remoteChange, seedChange] = seen
    expect(localChange).toEqual({
      itemId: rowId(),
      remote: false,
      value: { ton: 12 },
    })
    expect(remoteChange?.itemId).toBe(rowId())
    expect(remoteChange?.remote).toBe(true)
    // ton 是并发写同一个键：值确定但具体是谁的由 Yjs 定序决定
    expect([12, 13]).toContain(remoteChange?.value.ton)
    // remark 只由远端写过，必然保留
    expect(remoteChange?.value.remark).toBe('远端')
    expect(seedChange).toEqual({
      itemId: rowId(20),
      remote: false,
      value: { ton: 30 },
    })
    stop()
  })

  it('取消订阅后不再回调', () => {
    const doc = new Y.Doc()
    let calls = 0
    const stop = observeQuoteSheetItems(doc, () => {
      calls += 1
    })
    writeQuoteSheetItem(doc, rowId(), { ton: 1 })
    stop()
    writeQuoteSheetItem(doc, rowId(), { ton: 2 })
    expect(calls).toBe(1)
  })
})

describe('quote-sheet-doc 两客户端收敛', () => {
  it('两人同时改同一行 ton：交换 update 后两端一致（值确定）', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    // 行已由首同步播种进文档（真实流程），两端再并发改同一个键
    writeQuoteSheetItem(a, rowId(), { ton: 1 })
    syncBothWays(a, b)

    writeQuoteSheetItem(a, rowId(), { ton: 10 })
    writeQuoteSheetItem(b, rowId(), { ton: 20 })
    syncBothWays(a, b)

    const valueA = readQuoteSheetItem(a, rowId())?.ton
    const valueB = readQuoteSheetItem(b, rowId())?.ton
    expect(valueA).toBe(valueB)
    expect([10, 20]).toContain(valueA)
  })

  it('一人改 ton、另一人改同一行备注：两条都保留（行已存在的前提下）', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    /*
     * 真实流程里房间初始化会把全部行播种进文档、再等首同步完成，之后两端才可能并发编辑；
     * 这里先建共同基线，模拟"行已在文档里"。
     */
    writeQuoteSheetItem(a, rowId(), { ton: 1 })
    syncBothWays(a, b)

    writeQuoteSheetItem(a, rowId(), { ton: 15 })
    writeQuoteSheetItem(b, rowId(), { remark: '张三备注' })
    syncBothWays(a, b)

    expect(readQuoteSheetItem(a, rowId())).toEqual({
      ton: 15,
      remark: '张三备注',
    })
  })

  it('离线改多行后重连合并：一行不丢', () => {
    const online = new Y.Doc()
    const offline = new Y.Doc()
    writeQuoteSheetItem(online, rowId(1), { ton: 1 })
    syncBothWays(online, offline)

    for (let index = 2; index <= 20; index += 1) {
      writeQuoteSheetItem(offline, rowId(index), { ton: index })
    }
    writeQuoteSheetItem(online, rowId(99), { ton: 99 })
    syncBothWays(online, offline)

    for (let index = 2; index <= 20; index += 1) {
      expect(readQuoteSheetItem(online, rowId(index))?.ton).toBe(index)
      expect(readQuoteSheetItem(offline, rowId(index))?.ton).toBe(index)
    }
    expect(readQuoteSheetItem(offline, rowId(99))?.ton).toBe(99)
  })

  it('origin 常量与供应商报价表一致（同一套本地/播种标记）', () => {
    expect(COLLAB_LOCAL_ORIGIN).not.toBe(COLLAB_SEED_ORIGIN)
  })
})
