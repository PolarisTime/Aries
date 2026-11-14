import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  COLLAB_CELL_KEY_SEPARATOR,
  COLLAB_LOCAL_ORIGIN,
  COLLAB_SEED_ORIGIN,
  type CollabCellValue,
  collabCellKeyOf,
  collabCellKeyOfRowKey,
  collabRowKeyOfCellKey,
  isCollabDocEmpty,
  observeCollabCells,
  readCollabCell,
  readCollabMeta,
  readCollabPrice,
  seedCollabCells,
  writeCollabCell,
  writeCollabMeta,
} from './collab-doc'

/**
 * 文档 schema 与 CRDT 合并语义（node 环境，不依赖 DOM/网络）。
 *
 * <p>锁三件事：① 格键口径（与 REST 行键同构、用 NUL 分隔）；② 两客户端并发/离线改动的
 * 收敛（设计文档 §0 验收口径）；③ `null`（不报价）与 `undefined`（文档里没有这一格）
 * 必须可区分 —— 前者是"清空"，后者是"还没同步到，应回退 REST 值"。</p>
 */

const cell = (
  price: number | null,
  extra: Partial<CollabCellValue> = {},
): CollabCellValue => ({ price, priceStatus: 'NORMAL', remark: '', ...extra })

const cellKey = (spec = 12) =>
  collabCellKeyOf({
    category: '直条',
    material: 'HRB400E',
    spec,
    length: '9米',
  })

/** 两个文档之间互相同步全部状态（等价于一次双向重连合并）。 */
function syncBothWays(left: Y.Doc, right: Y.Doc) {
  Y.applyUpdate(right, Y.encodeStateAsUpdate(left))
  Y.applyUpdate(left, Y.encodeStateAsUpdate(right))
}

describe('collab-doc 格键口径', () => {
  it('cellKey 用 NUL 分隔四个字段', () => {
    expect(cellKey()).toBe(
      ['直条', 'HRB400E', '12', '9米'].join(COLLAB_CELL_KEY_SEPARATOR),
    )
    expect(cellKey().includes(COLLAB_CELL_KEY_SEPARATOR)).toBe(true)
  })

  it('REST 行键与 CRDT 格键可互相转换（与 quoteRowKey 同序）', () => {
    const rowKey = '直条|HRB400E|12|9米'
    const key = collabCellKeyOfRowKey(rowKey)
    expect(key).toBe(cellKey())
    expect(collabRowKeyOfCellKey(key)).toBe(rowKey)
  })

  it('规格是数字还是字符串都产生同一个键', () => {
    const numeric = collabCellKeyOf({
      category: '盘螺',
      material: 'HRB400',
      spec: 8,
      length: '-',
    })
    const textual = collabCellKeyOf({
      category: '盘螺',
      material: 'HRB400',
      spec: '8',
      length: '-',
    })
    expect(numeric).toBe(textual)
  })
})

describe('collab-doc 读写', () => {
  it('写价格后能按格读回，且 0 元与"不报价"严格区分', () => {
    const doc = new Y.Doc()
    writeCollabCell(doc, cellKey(12), { price: 0 })
    writeCollabCell(doc, cellKey(14), { price: null })
    expect(readCollabPrice(doc, cellKey(12))).toBe(0)
    expect(readCollabPrice(doc, cellKey(14))).toBeNull()
    // 文档里没有这一格 → undefined（调用方应回退 REST 值，而不是显示空）
    expect(readCollabPrice(doc, cellKey(16))).toBeUndefined()
    expect(readCollabCell(doc, cellKey(16))).toBeNull()
  })

  it('一格是一个整体：状态/备注与价格一起读回，未写的字段保持现值', () => {
    const doc = new Y.Doc()
    writeCollabCell(doc, cellKey(), {
      price: 3280,
      priceStatus: 'OUT_OF_STOCK',
      remark: '缺货',
    })
    writeCollabCell(doc, cellKey(), { price: 3300 })
    expect(readCollabCell(doc, cellKey())).toEqual({
      price: 3300,
      priceStatus: 'OUT_OF_STOCK',
      remark: '缺货',
    })
  })

  it('meta 读写：listId / supplierId / brandName 原样往返', () => {
    const doc = new Y.Doc()
    writeCollabMeta(doc, {
      listId: '9007199254740995',
      supplierId: '9007199254740993',
      brandName: '萍钢',
    })
    expect(readCollabMeta(doc)).toMatchObject({
      listId: '9007199254740995',
      supplierId: '9007199254740993',
      brandName: '萍钢',
    })
  })

  it('空文档判定：只有写进格子之后才算非空', () => {
    const doc = new Y.Doc()
    expect(isCollabDocEmpty(doc)).toBe(true)
    writeCollabMeta(doc, { listId: '1' })
    expect(isCollabDocEmpty(doc)).toBe(true)
    writeCollabCell(doc, cellKey(), { price: 3280 })
    expect(isCollabDocEmpty(doc)).toBe(false)
  })

  it('播种只补缺失格，不覆盖房间已有的值', () => {
    const doc = new Y.Doc()
    writeCollabCell(doc, cellKey(12), { price: 3280 })
    seedCollabCells(doc, [
      [cellKey(12), cell(3000)],
      [cellKey(14), cell(3200)],
    ])
    expect(readCollabPrice(doc, cellKey(12))).toBe(3280)
    expect(readCollabPrice(doc, cellKey(14))).toBe(3200)
  })
})

describe('collab-doc 两客户端收敛', () => {
  it('两人同时改同一格：交换 update 后两端一致（值确定、不出现分叉）', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    writeCollabCell(a, cellKey(), { price: 3280 })
    writeCollabCell(b, cellKey(), { price: 3290 })
    syncBothWays(a, b)

    expect(readCollabPrice(a, cellKey())).toBe(readCollabPrice(b, cellKey()))
    expect([3280, 3290]).toContain(readCollabPrice(a, cellKey()))
  })

  it('两人改不同格：两条改动都保留', () => {
    const a = new Y.Doc()
    const b = new Y.Doc()
    writeCollabCell(a, cellKey(12), { price: 3280 })
    writeCollabCell(b, cellKey(14), { price: 3290 })
    syncBothWays(a, b)

    expect(readCollabPrice(a, cellKey(12))).toBe(3280)
    expect(readCollabPrice(a, cellKey(14))).toBe(3290)
    expect(readCollabPrice(b, cellKey(12))).toBe(3280)
    expect(readCollabPrice(b, cellKey(14))).toBe(3290)
  })

  it('离线改 50 格后重连合并：一格都不丢', () => {
    const online = new Y.Doc()
    const offline = new Y.Doc()
    // 先建立一份共同基线
    writeCollabCell(online, cellKey(10), { price: 3100 })
    syncBothWays(online, offline)

    const specs = Array.from({ length: 50 }, (_, index) => 10 + index)
    for (const spec of specs) {
      writeCollabCell(offline, cellKey(spec), { price: 3000 + spec })
    }
    // 离线期间对方也在改别的一格
    writeCollabCell(online, cellKey(99), { price: 3500 })
    syncBothWays(online, offline)

    for (const spec of specs) {
      expect(readCollabPrice(online, cellKey(spec))).toBe(3000 + spec)
      expect(readCollabPrice(offline, cellKey(spec))).toBe(3000 + spec)
    }
    expect(readCollabPrice(offline, cellKey(99))).toBe(3500)
  })

  it('撤销只撤自己的操作，不撤别人的改动', () => {
    const doc = new Y.Doc()
    const undoManager = new Y.UndoManager(doc.getMap('cells'), {
      trackedOrigins: new Set([COLLAB_LOCAL_ORIGIN]),
    })
    const remote = new Y.Doc()
    writeCollabCell(remote, cellKey(14), { price: 3400 })
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote), 'provider')

    // 远端改动不进撤销栈
    expect(undoManager.canUndo()).toBe(false)

    writeCollabCell(doc, cellKey(12), { price: 3280 })
    expect(undoManager.canUndo()).toBe(true)
    undoManager.undo()

    // 自己的格被撤销，别人的格原样保留
    expect(readCollabPrice(doc, cellKey(12))).not.toBe(3280)
    expect(readCollabPrice(doc, cellKey(14))).toBe(3400)
    undoManager.destroy()
  })
})

describe('collab-doc 变化观察', () => {
  it('本地写标记 remote=false，远端 update 标记 remote=true，播种不算远端', () => {
    const doc = new Y.Doc()
    const seen: { cellKey: string; remote: boolean }[] = []
    const stop = observeCollabCells(doc, (changes) => {
      for (const change of changes) {
        seen.push({ cellKey: change.cellKey, remote: change.remote })
      }
    })

    writeCollabCell(doc, cellKey(12), { price: 3280 })
    seedCollabCells(doc, [[cellKey(14), cell(3200)]])
    const remote = new Y.Doc()
    writeCollabCell(remote, cellKey(16), { price: 3300 })
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote), 'provider')

    expect(seen).toEqual([
      { cellKey: cellKey(12), remote: false },
      { cellKey: cellKey(14), remote: false },
      { cellKey: cellKey(16), remote: true },
    ])
    stop()
  })

  it('改已有格子的价格也会被观察到（嵌套 Y.Map 必须用 observeDeep）', () => {
    const doc = new Y.Doc()
    writeCollabCell(doc, cellKey(12), { price: 3280 })
    const seen: { cellKey: string; price: number | null }[] = []
    const stop = observeCollabCells(doc, (changes) => {
      for (const change of changes) {
        seen.push({
          cellKey: change.cellKey,
          price: change.value?.price ?? null,
        })
      }
    })

    writeCollabCell(doc, cellKey(12), { price: 3300 })
    expect(seen).toEqual([{ cellKey: cellKey(12), price: 3300 }])
    stop()
  })

  it('取消订阅后不再回调', () => {
    const doc = new Y.Doc()
    let calls = 0
    const stop = observeCollabCells(doc, () => {
      calls += 1
    })
    writeCollabCell(doc, cellKey(12), { price: 3280 })
    stop()
    writeCollabCell(doc, cellKey(14), { price: 3290 })
    expect(calls).toBe(1)
  })
})

describe('collab-doc origin 常量', () => {
  it('播种与本地写使用不同的 origin（撤销栈/冲突提示据此区分）', () => {
    expect(COLLAB_SEED_ORIGIN).not.toBe(COLLAB_LOCAL_ORIGIN)
  })
})
