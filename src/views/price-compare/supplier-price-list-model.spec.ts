import { describe, expect, it } from 'vitest'
import type {
  SupplierPriceColumn,
  SupplierPriceGrid,
} from '@/api/market/supplier-price-lists'
import {
  brandColumnOrder,
  buildColumnSavePlan,
  draftCount,
  draftPrice,
  mergeQuoteRows,
  type QuoteRow,
  quoteRowKey,
  revertDraftPrice,
  type ServerCell,
  serverCellsOf,
  setDraftPrice,
} from './supplier-price-list-model'

const row = (
  category: string,
  material: string,
  spec: number,
  length: string,
): QuoteRow => ({ category, material, spec, length })

const ROW_A = row('螺纹钢', 'HRB400', 12, '9米')
const ROW_B = row('螺纹钢', 'HRB400', 14, '9米')

const column = (listId: string, supplierId = 's1'): SupplierPriceColumn => ({
  listId,
  supplierId,
  supplierName: '浙江铁都',
  quotedOn: '2026-10-23',
  updatedAt: null,
  warehouse: null,
  version: 3,
})

describe('草稿：清空必须是一个可保存的状态', () => {
  it('未改动的格子沿用服务端价格', () => {
    expect(draftPrice(undefined, quoteRowKey(ROW_A), 3280)).toBe(3280)
  })

  it('改动后的格子用草稿价', () => {
    const draft = setDraftPrice(undefined, quoteRowKey(ROW_A), 3300)
    expect(draftPrice(draft, quoteRowKey(ROW_A), 3280)).toBe(3300)
  })

  it('清空的格子渲染为空，而不是回落到服务端旧价', () => {
    // 历史缺陷：清空时删键 → 渲染又读回服务端价格，界面上看不出清空、保存也清不掉。
    const draft = setDraftPrice(undefined, quoteRowKey(ROW_A), null)
    expect(draftPrice(draft, quoteRowKey(ROW_A), 3280)).toBeNull()
    expect(quoteRowKey(ROW_A) in draft).toBe(true)
  })

  it('0 是真实价格，不能被当成空值', () => {
    const draft = setDraftPrice(undefined, quoteRowKey(ROW_A), 0)
    expect(draftPrice(draft, quoteRowKey(ROW_A), 3280)).toBe(0)
    expect(draftCount(draft)).toBe(1)
  })

  it('撤销改动后回到服务端价格', () => {
    const draft = setDraftPrice(undefined, quoteRowKey(ROW_A), 3300)
    expect(draftCount(revertDraftPrice(draft, quoteRowKey(ROW_A)))).toBe(0)
  })
})

describe('构建保存计划：整组替换 + 不丢附加字段', () => {
  const rows = [ROW_A, ROW_B]

  it('没有改动时不产生保存计划', () => {
    expect(
      buildColumnSavePlan({
        brandName: '中天',
        column: column('l1'),
        rows,
        draft: undefined,
        serverCells: new Map(),
      }),
    ).toBeNull()
  })

  it('未改动的服务端价格也要带上，否则整组替换会把它们删掉', () => {
    const serverCells = new Map<string, ServerCell>([
      [quoteRowKey(ROW_A), { price: 3280 }],
      [quoteRowKey(ROW_B), { price: 3300 }],
    ])
    const plan = buildColumnSavePlan({
      brandName: '中天',
      column: column('l1'),
      rows,
      draft: setDraftPrice(undefined, quoteRowKey(ROW_A), 3290),
      serverCells,
    })

    expect(plan?.items).toEqual([
      { ...ROW_A, price: 3290 },
      { ...ROW_B, price: 3300 },
    ])
  })

  it('清空的格子不出现在条目里（服务端据此删除）', () => {
    const serverCells = new Map<string, ServerCell>([
      [quoteRowKey(ROW_A), { price: 3280 }],
      [quoteRowKey(ROW_B), { price: 3300 }],
    ])
    const plan = buildColumnSavePlan({
      brandName: '中天',
      column: column('l1'),
      rows,
      draft: setDraftPrice(undefined, quoteRowKey(ROW_A), null),
      serverCells,
    })

    expect(plan?.items).toEqual([{ ...ROW_B, price: 3300 }])
  })

  it('报价状态与备注原样回传，避免被重置为 NORMAL/清空', () => {
    const serverCells = new Map<string, ServerCell>([
      [
        quoteRowKey(ROW_A),
        { price: 3280, priceStatus: 'OUT_OF_STOCK', remark: '缺货' },
      ],
    ])
    const plan = buildColumnSavePlan({
      brandName: '中天',
      column: column('l1'),
      rows: [ROW_A],
      draft: setDraftPrice(undefined, quoteRowKey(ROW_A), 3290),
      serverCells,
    })

    expect(plan?.items).toEqual([
      {
        ...ROW_A,
        price: 3290,
        priceStatus: 'OUT_OF_STOCK',
        remark: '缺货',
      },
    ])
  })

  it('新列有价格时先建列（column 为 null）', () => {
    const plan = buildColumnSavePlan({
      brandName: '永钢',
      column: null,
      rows: [ROW_A],
      draft: setDraftPrice(undefined, quoteRowKey(ROW_A), 3280),
      serverCells: new Map(),
    })

    expect(plan).toEqual({
      brandName: '永钢',
      column: null,
      items: [{ ...ROW_A, price: 3280 }],
    })
  })

  it('新列一个价都没填时不建空表', () => {
    expect(
      buildColumnSavePlan({
        brandName: '永钢',
        column: null,
        rows: [ROW_A],
        draft: setDraftPrice(undefined, quoteRowKey(ROW_A), null),
        serverCells: new Map(),
      }),
    ).toBeNull()
  })
})

describe('品牌列集合与顺序', () => {
  it('经营品牌在前，商品品牌补齐，手动追加排最后，且去重', () => {
    expect(
      brandColumnOrder({
        declared: ['中天', '永钢'],
        discover: ['永钢', '沙钢', ''],
        extra: ['中天', '日照'],
      }),
    ).toEqual(['中天', '永钢', '沙钢', '日照'])
  })

  it('经营品牌为空时仍能用商品品牌发现历史数据', () => {
    expect(
      brandColumnOrder({ declared: [], discover: ['中天'], extra: [] }),
    ).toEqual(['中天'])
  })
})

describe('行集合与网格取值', () => {
  it('商品资料规格与历史报价行合并、去重并按类别/材质/规格/定尺排序', () => {
    const historical = [row('螺纹钢', 'HRB400', 14, '9米')]
    expect(mergeQuoteRows([ROW_A, ROW_B], historical)).toEqual([ROW_A, ROW_B])
  })

  it('历史行即使不在商品资料里也保留', () => {
    const removed = row('螺纹钢', 'HRB400', 40, '12米')
    expect(mergeQuoteRows([ROW_A], [removed])).toEqual([ROW_A, removed])
  })

  it('serverCellsOf 只取本列价格，忽略其它供应商列', () => {
    const grid: SupplierPriceGrid = {
      brandName: '中天',
      columns: [column('l1'), column('l2', 's2')],
      rows: [
        {
          ...ROW_A,
          prices: { l1: 3280, l2: 3200 },
          priceStatuses: { l2: 'NORMAL' },
          remarks: {},
        },
        {
          ...ROW_B,
          prices: { l2: 3300 },
          priceStatuses: {},
          remarks: {},
        },
      ],
    }

    const cells = serverCellsOf(grid, column('l1'))
    expect(cells.get(quoteRowKey(ROW_A))?.price).toBe(3280)
    expect(cells.has(quoteRowKey(ROW_B))).toBe(false)
  })

  it('没有列时返回空映射（新列还没有服务端价格）', () => {
    expect(serverCellsOf(undefined, null).size).toBe(0)
  })
})
