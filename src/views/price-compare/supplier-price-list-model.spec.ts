import { describe, expect, it } from 'vitest'
import type {
  SupplierPriceColumn,
  SupplierPriceGrid,
} from '@/api/market/supplier-price-lists'
import {
  brandColumnOrder,
  buildBrandCatalog,
  buildColumnSavePlan,
  catalogHas,
  draftCount,
  draftPrice,
  mergeQuoteRows,
  type QuoteRow,
  quoteRowFromKey,
  quoteRowKey,
  revertDraftPrice,
  type ServerCell,
  serverCellsOf,
  setDraftPrice,
  sortSuppliersByQuoted,
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

  it('商品资料里已没有的历史行：不显示，但保存载荷仍带它的价格（整列替换不得清掉）', () => {
    // 场景：商品资料停用了 螺纹钢 HRB400 40 12米，但该列仍存着它的报价。
    // 行只取自商品资料 ⇒ 表里看不到这行；保存是 PUT 整列替换 ⇒ 载荷里必须仍有它。
    const removed = row('螺纹钢', 'HRB400', 40, '12米')
    const serverCells = new Map<string, ServerCell>([
      [quoteRowKey(ROW_A), { price: 3280 }],
      [quoteRowKey(removed), { price: 3500, remark: '停产前最后一版' }],
    ])
    const plan = buildColumnSavePlan({
      brandName: '中天',
      column: column('l1'),
      rows: [ROW_A], // 可见行里没有 removed
      draft: setDraftPrice(undefined, quoteRowKey(ROW_A), 3290),
      serverCells,
    })

    expect(plan?.items).toEqual([
      { ...ROW_A, price: 3290 },
      { ...removed, price: 3500, remark: '停产前最后一版' },
    ])
  })

  it('历史行被显式清空时仍按「省略该行」删除（清空语义不被并集吞掉）', () => {
    const removed = row('螺纹钢', 'HRB400', 40, '12米')
    const serverCells = new Map<string, ServerCell>([
      [quoteRowKey(removed), { price: 3500 }],
    ])
    const plan = buildColumnSavePlan({
      brandName: '中天',
      column: column('l1'),
      rows: [ROW_A],
      draft: setDraftPrice(undefined, quoteRowKey(removed), null),
      serverCells,
    })

    expect(plan?.items).toEqual([])
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
  it('商品资料规格去重并按类别/材质/规格/定尺排序', () => {
    expect(mergeQuoteRows([ROW_B, ROW_A, { ...ROW_A }])).toEqual([ROW_A, ROW_B])
  })

  it('历史行不在商品资料里时不显示（表里只出现商品资料中的组合）', () => {
    // 商品被停用/删除后，它的旧报价不建行：否则会出现「只有一格能填、其余全是 —」的残行
    const removed = row('螺纹钢', 'HRB400', 40, '12米')
    expect(mergeQuoteRows([ROW_A])).toEqual([ROW_A])
    expect(mergeQuoteRows([ROW_A])).not.toContainEqual(removed)
  })

  it('quoteRowFromKey 把服务端条目键解析回行，非法键丢弃', () => {
    expect(quoteRowFromKey('螺纹钢|HRB400|12|9米')).toEqual(ROW_A)
    // 盘螺的定尺是 '-'，解析后要原样保留（不能被当成空串）
    expect(quoteRowFromKey('盘螺|HRB400|8|-')).toEqual(
      row('盘螺', 'HRB400', 8, '-'),
    )
    expect(quoteRowFromKey('螺纹钢|HRB400|abc|9米')).toBeNull()
    expect(quoteRowFromKey('螺纹钢|HRB400|0|9米')).toBeNull()
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

describe('buildBrandCatalog：叠加供应商品牌规格白名单', () => {
  const rows: QuoteRow[] = [
    {
      brand: '中天',
      category: '直条',
      material: 'HRB400E',
      spec: 12,
      length: '9米',
    },
    {
      brand: '中天',
      category: '直条',
      material: 'HRB400E',
      spec: 14,
      length: '9米',
    },
    {
      brand: '永钢',
      category: '直条',
      material: 'HRB400E',
      spec: 12,
      length: '9米',
    },
    {
      brand: '永钢',
      category: '直条',
      material: 'HRB400E',
      spec: 14,
      length: '9米',
    },
  ]

  it('已配置白名单的品牌收敛到允许规格，未配置品牌保留全量，且直条与螺纹钢等价匹配', () => {
    const catalog = buildBrandCatalog(rows, [
      {
        brandName: '中天',
        // 白名单存规范名「螺纹钢」，商品行是「直条」也必须命中
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
      },
    ])

    const straight = catalog.get('直条')
    expect(catalogHas(straight, '中天', 'HRB400E', 12, '9米')).toBe(true)
    expect(catalogHas(straight, '中天', 'HRB400E', 14, '9米')).toBe(false)
    // 永钢未在白名单中配置 → 保持商品资料全量
    expect(catalogHas(straight, '永钢', 'HRB400E', 12, '9米')).toBe(true)
    expect(catalogHas(straight, '永钢', 'HRB400E', 14, '9米')).toBe(true)
  })
})

describe('sortSuppliersByQuoted：有价供应商优先且组内保序', () => {
  const list = [
    { value: 's1', label: 'A公司' },
    { value: 's2', label: 'B公司' },
    { value: 's3', label: 'C公司' },
    { value: 's4', label: 'D公司' },
  ]

  it('有价格的排前面、无价格的排后面，两组内保持原相对顺序且不改原数组', () => {
    const sorted = sortSuppliersByQuoted(list, new Set(['s4', 's2']))
    expect(sorted.map((item) => item.value)).toEqual(['s2', 's4', 's1', 's3'])
    expect(list.map((item) => item.value)).toEqual(['s1', 's2', 's3', 's4'])
  })

  it('无有价记录或全部有价时保持原始顺序', () => {
    expect(
      sortSuppliersByQuoted(list, new Set()).map((item) => item.value),
    ).toEqual(['s1', 's2', 's3', 's4'])
    expect(
      sortSuppliersByQuoted(list, new Set(['s1', 's2', 's3', 's4'])).map(
        (item) => item.value,
      ),
    ).toEqual(['s1', 's2', 's3', 's4'])
  })
})
