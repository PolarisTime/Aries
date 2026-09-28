import { describe, expect, it } from 'vitest'
import type {
  SupplierPriceListItem,
  SupplierPriceListSummary,
  SupplierPriceSpecCatalogEntry,
} from '@/api/master/supplier-price-lists'
import { zhCN } from '@/locales/zh-CN'
import {
  addBrandColumn,
  applyBrandItems,
  applyMatrixPaste,
  buildMatrixAdjustmentPreview,
  buildMatrixState,
  buildPriceRowKey,
  buildReplaceItems,
  computeMatrixStats,
  countFilledForBrand,
  describePriceRow,
  dirtyBrandNames,
  filterMatrixRows,
  formatUpdatedAt,
  isAdjustmentAmountValid,
  matrixSignature,
  normalizeSpecNumber,
  PRICE_ITEM_STATUS_I18N_KEYS,
  PRICE_ITEM_STATUS_ORDER,
  PRICE_ITEM_STATUS_ZH_LABELS,
  type PriceMatrixState,
  parsePriceCellText,
  removeBrandColumn,
  updateMatrixCell,
  validateMatrixRows,
  wouldPriceGoNegative,
} from './supplier-price-list-editor-model'

const SUPPLIER_ID = '1234567890123456789'

const CATALOG: SupplierPriceSpecCatalogEntry[] = [
  {
    category: '螺纹钢',
    material: '抗震钢E',
    spec: 12,
    length: '9米',
    sortOrder: 0,
  },
  {
    category: '螺纹钢',
    material: '抗震钢E',
    spec: 12,
    length: '12米',
    sortOrder: 1,
  },
  {
    category: '螺纹钢',
    material: '抗震钢E',
    spec: 14,
    length: '9米',
    sortOrder: 2,
  },
  { category: '盘螺', material: '盘螺400E', spec: 8, length: '', sortOrder: 3 },
]

function listSummary(
  brandName: string,
  overrides: Partial<SupplierPriceListSummary> = {},
): SupplierPriceListSummary {
  return {
    id: `190000000000000006`,
    supplierId: SUPPLIER_ID,
    supplierName: '杭州中金钢铁',
    brandName,
    updatedAt: '2026-09-28T14:35:00',
    itemCount: 1,
    ...overrides,
  }
}

function item(
  overrides: Partial<SupplierPriceListItem> = {},
): SupplierPriceListItem {
  return {
    id: '1900000000000000011',
    category: '螺纹钢',
    material: '抗震钢E',
    spec: 12,
    length: '9米',
    price: 3220,
    priceStatus: 'NORMAL',
    remark: null,
    sortOrder: 0,
    ...overrides,
  }
}

function buildState(): PriceMatrixState {
  return buildMatrixState({
    catalog: CATALOG,
    lists: [listSummary('安徽富鑫')],
    supplierBrands: ['安徽富鑫', '萍钢'],
  })
}

describe('规格归一化与条目键', () => {
  it('字符串规格归一化为正整数，非法值返回 null', () => {
    expect(normalizeSpecNumber('12')).toBe(12)
    expect(normalizeSpecNumber('Φ12')).toBe(12)
    expect(normalizeSpecNumber('12mm')).toBe(12)
    expect(normalizeSpecNumber(14)).toBe(14)
    expect(normalizeSpecNumber('0')).toBeNull()
    expect(normalizeSpecNumber('-3')).toBeNull()
    expect(normalizeSpecNumber('abc')).toBeNull()
    expect(normalizeSpecNumber('')).toBeNull()
  })

  it('条目键按 类别+材质+规格+长度 归一化，规格非法时为 null', () => {
    const key = buildPriceRowKey({
      category: ' 螺纹钢 ',
      material: '抗震钢E',
      spec: '12',
      length: '9米',
    })
    expect(key).toBe(
      buildPriceRowKey({
        category: '螺纹钢',
        material: '抗震钢E',
        spec: 12,
        length: '9米',
      }),
    )
    expect(
      buildPriceRowKey({ material: '抗震钢E', spec: 'x', length: '9米' }),
    ).toBeNull()
  })
})

describe('状态枚举中文映射', () => {
  it('契约枚举与语言包文案一一对应', () => {
    expect(PRICE_ITEM_STATUS_ORDER).toEqual([
      'NORMAL',
      'PENDING',
      'BUNDLED',
      'NEGOTIABLE',
      'OUT_OF_STOCK',
    ])
    for (const status of PRICE_ITEM_STATUS_ORDER) {
      const key = PRICE_ITEM_STATUS_I18N_KEYS[status]
      const resolved = key
        .split('.')
        .reduce<unknown>(
          (current, segment) =>
            current && typeof current === 'object'
              ? (current as Record<string, unknown>)[segment]
              : undefined,
          zhCN,
        )
      expect(resolved, `${status} 缺少中文文案 ${key}`).toBe(
        PRICE_ITEM_STATUS_ZH_LABELS[status],
      )
    }
  })
})

describe('单价空值语义', () => {
  it('空文本 = 不报价(null)，0 文本 = 0 元', () => {
    expect(parsePriceCellText('')).toEqual({ price: null })
    expect(parsePriceCellText('   ')).toEqual({ price: null })
    expect(parsePriceCellText('0')).toEqual({ price: 0 })
    expect(parsePriceCellText('0.00')).toEqual({ price: 0 })
    expect(parsePriceCellText('3220.5')).toEqual({ price: 3220.5 })
    expect(parsePriceCellText('-1')).toEqual({
      price: null,
      error: '单价不得为负',
    })
    expect(parsePriceCellText('abc').error).toBeTruthy()
  })
})

describe('矩阵构建（供应商 + 品牌 = 一张现表）', () => {
  it('行来自规格全集，列 = 已有价格表的品牌 ∪ 经营品牌', () => {
    const state = buildState()
    expect(state.rows).toHaveLength(4)
    expect(state.brandOrder).toEqual(['安徽富鑫', '萍钢'])
    expect(state.lists['安徽富鑫'].listId).toBe('190000000000000006')
    expect(state.lists['萍钢'].listId).toBeNull()
    expect(state.invalidCatalogCount).toBe(0)
  })

  it('规格无法归一化或归一化后重复的行只保留一条并计数脏行', () => {
    const state = buildMatrixState({
      catalog: [
        ...CATALOG,
        { ...CATALOG[0], sortOrder: 9 },
        {
          category: '螺纹钢',
          material: '脏数据',
          spec: 'abc',
          length: '9米',
          sortOrder: 5,
        } as unknown as SupplierPriceSpecCatalogEntry,
      ],
      lists: [],
    })
    expect(state.rows).toHaveLength(4)
    expect(state.invalidCatalogCount).toBe(1)
  })

  it('现表条目按归一化键带出单价/条目 ID/状态/备注；不报价仍是 null', () => {
    const state = applyBrandItems(buildState(), '安徽富鑫', [
      item(),
      item({
        id: '1900000000000000012',
        // 后端历史上可能返回字符串规格（md_material.spec 为 varchar），这里刻意验证归一化
        spec: '14' as unknown as number,
        price: null,
        priceStatus: 'OUT_OF_STOCK',
        remark: '无货',
      }),
    ])
    const key12 = buildPriceRowKey(CATALOG[0]) as string
    const key14 = buildPriceRowKey(CATALOG[2]) as string
    expect(state.cells['安徽富鑫'][key12].price).toBe(3220)
    expect(state.cells['安徽富鑫'][key12].itemId).toBe('1900000000000000011')
    expect(state.cells['安徽富鑫'][key14].price).toBeNull()
    expect(state.cells['安徽富鑫'][key14].priceStatus).toBe('OUT_OF_STOCK')
    expect(state.cells['安徽富鑫'][key14].remark).toBe('无货')
  })
})

describe('品牌列增删与单元格写入', () => {
  it('添加/移除品牌列不影响其它列，重复添加幂等', () => {
    const added = addBrandColumn(buildState(), ' 武钢汉钢 ')
    expect(added.brandOrder).toEqual(['安徽富鑫', '萍钢', '武钢汉钢'])
    expect(addBrandColumn(added, '武钢汉钢').brandOrder).toEqual(
      added.brandOrder,
    )
    const removed = removeBrandColumn(added, '武钢汉钢')
    expect(removed.brandOrder).toEqual(['安徽富鑫', '萍钢'])
    expect(removed.lists['武钢汉钢']).toBeUndefined()
  })

  it('单元格写入只改目标键，空串品牌名不写', () => {
    const key = buildPriceRowKey(CATALOG[0]) as string
    const next = updateMatrixCell(buildState(), '萍钢', key, { price: 3300 })
    expect(next.cells['萍钢'][key].price).toBe(3300)
    expect(next.cells['安徽富鑫']).toBeUndefined()
    expect(updateMatrixCell(next, '', key, { price: 1 })).toBe(next)
  })
})

describe('全量替换载荷守卫', () => {
  it('服务端已有条目（含 price 为 null）必须保留，本地新填只带非空价', () => {
    const state = applyBrandItems(buildState(), '安徽富鑫', [
      item({ price: null }),
      item({ id: '1900000000000000013', spec: 14, length: '9米', price: null }),
    ])
    const key12 = buildPriceRowKey(CATALOG[0]) as string
    const next = updateMatrixCell(state, '安徽富鑫', key12, { price: 3300 })
    const items = buildReplaceItems(next, '安徽富鑫')
    expect(items).toHaveLength(2)
    expect(items[0].price).toBe(3300)
    expect(items[1].price).toBeNull()
    expect(items[1].length).toBe('9米')
  })

  it('规格全集外的历史脏键条目通过 preservedItems 保留，不被静默删除', () => {
    const state = buildState()
    const key = buildPriceRowKey(CATALOG[0]) as string
    const next = updateMatrixCell(state, '安徽富鑫', key, { price: 3300 })
    const items = buildReplaceItems(next, '安徽富鑫', [
      item({
        id: '1900000000000000099',
        category: '螺纹钢',
        material: '已停产材质',
        spec: 40,
        price: 100,
      }),
    ])
    expect(items.map((entry) => entry.material)).toEqual([
      '抗震钢E',
      '已停产材质',
    ])
    expect(items[1].price).toBe(100)
  })

  it('空价新行不落库：全空品牌列提交空 items', () => {
    expect(buildReplaceItems(buildState(), '萍钢')).toEqual([])
  })

  it('itemId 存在但价为 null 的条目仍然提交（表达「不报价」）', () => {
    const state = applyBrandItems(buildState(), '安徽富鑫', [
      item({ price: null }),
    ])
    const items = buildReplaceItems(state, '安徽富鑫')
    expect(items).toHaveLength(1)
    expect(items[0].price).toBeNull()
  })
})

describe('行级校验与统计', () => {
  it('同一 类别+材质+规格+长度 重复时两行都给重复错误', () => {
    const rows = buildState().rows
    const errors = validateMatrixRows([
      { ...rows[0] },
      { ...rows[0], uid: 'dup' },
    ])
    expect(errors.size).toBe(2)
    expect(errors.get('dup')?.duplicate).toBe(
      '同一类别+材质+规格+长度的条目重复',
    )
  })

  it('统计行数/品牌列数/已填与未填', () => {
    const key = buildPriceRowKey(CATALOG[0]) as string
    const state = updateMatrixCell(buildState(), '安徽富鑫', key, { price: 0 })
    const stats = computeMatrixStats(state)
    expect(stats.totalRows).toBe(4)
    expect(stats.brandCount).toBe(2)
    // 0 元是真实报价，必须计入已填
    expect(stats.filledTotal).toBe(1)
    expect(stats.emptyTotal).toBe(7)
    expect(countFilledForBrand(state, '萍钢')).toBe(0)
    expect(formatUpdatedAt(stats.updatedAt)).toBe('2026-09-28 14:35')
  })
})

describe('筛选', () => {
  it('按品牌筛选已填/未填，未指定品牌时按任一品牌已填', () => {
    const key = buildPriceRowKey(CATALOG[0]) as string
    const state = updateMatrixCell(buildState(), '安徽富鑫', key, { price: 1 })
    expect(
      filterMatrixRows(state, { fill: 'FILLED', fillBrand: '安徽富鑫' }),
    ).toHaveLength(1)
    expect(
      filterMatrixRows(state, { fill: 'FILLED', fillBrand: '萍钢' }),
    ).toHaveLength(0)
    expect(filterMatrixRows(state, { fill: 'FILLED' })).toHaveLength(1)
    expect(filterMatrixRows(state, { fill: 'UNFILLED' })).toHaveLength(3)
    expect(filterMatrixRows(state, { keyword: 'Φ8' })).toHaveLength(1)
    expect(
      filterMatrixRows(state, { category: '螺纹钢', material: '抗震钢E' }),
    ).toHaveLength(3)
  })
})

describe('整体加减预览（跨品牌）', () => {
  function stateWithPrices(): PriceMatrixState {
    const base = buildState()
    const key14 = buildPriceRowKey(CATALOG[2]) as string
    let state = applyBrandItems(base, '安徽富鑫', [
      item(),
      item({ id: '1900000000000000012', spec: 14, length: '9米', price: 30 }),
    ])
    state = applyBrandItems(state, '萍钢', [
      item({ id: '1900000000000000021', price: 3000 }),
    ])
    state = {
      ...state,
      lists: {
        ...state.lists,
        萍钢: { ...state.lists['萍钢'], listId: '1900000000000000020' },
      },
    }
    // 萍钢再补一条本地新填（无 itemId）用于 unsaved 断言
    return updateMatrixCell(state, '萍钢', key14, { price: 3100 })
  }

  it('按品牌分组、跳过不报价条目、给出前后价', () => {
    const preview = buildMatrixAdjustmentPreview(stateWithPrices(), 'ADD', 50, [
      '安徽富鑫',
      '萍钢',
    ])
    expect(preview.affectedCount).toBe(3)
    expect(preview.brandPlans.map((plan) => plan.brandName)).toEqual([
      '安徽富鑫',
      '萍钢',
    ])
    expect(preview.brandPlans[0].itemIds).toEqual([
      '1900000000000000011',
      '1900000000000000012',
    ])
    // 萍钢：1 条已落库（3000）+ 1 条本地新填（无 itemId）
    expect(preview.brandPlans[1].itemIds).toEqual(['1900000000000000021'])
    expect(preview.unsavedCount).toBe(1)
    const rebar = preview.rows.find(
      (row) => row.brandName === '安徽富鑫' && row.priceBefore === 3220,
    )
    expect(rebar?.priceAfter).toBe(3270)
    // 不报价的行只计数不参与
    expect(preview.skippedCount).toBeGreaterThan(0)
    expect(preview.negativeLabels).toEqual([])
  })

  it('减价后为负的条目标记为 negative 且不静默截断', () => {
    const preview = buildMatrixAdjustmentPreview(
      stateWithPrices(),
      'SUBTRACT',
      100,
      ['安徽富鑫'],
    )
    expect(preview.negativeLabels).toEqual(['安徽富鑫 螺纹钢 抗震钢E Φ14 9米'])
    expect(preview.rows.some((row) => row.priceAfter < 0)).toBe(true)
    expect(wouldPriceGoNegative(30, 'SUBTRACT', 100)).toBe(true)
    expect(wouldPriceGoNegative(30, 'SUBTRACT', 30)).toBe(false)
  })

  it('尚未建表的品牌列单独回报，不参与加减', () => {
    const preview = buildMatrixAdjustmentPreview(buildState(), 'ADD', 50, [
      '萍钢',
    ])
    expect(preview.brandPlans).toEqual([])
    expect(preview.brandsWithoutList).toEqual(['萍钢'])
  })

  it('金额必须为正数', () => {
    expect(isAdjustmentAmountValid(50)).toBe(true)
    expect(isAdjustmentAmountValid(0)).toBe(false)
    expect(isAdjustmentAmountValid(-1)).toBe(false)
    expect(isAdjustmentAmountValid(null)).toBe(false)
  })
})

describe('TSV 粘贴（指定品牌列）', () => {
  it('按 材质/规格/长度/单价 对齐固定行，落进目标品牌列', () => {
    const result = applyMatrixPaste(
      buildState(),
      '安徽富鑫',
      ['抗震钢E\t12\t9米\t3220', '抗震钢E\t14\t9米\t', '盘螺400E\t8\t\t0'].join(
        '\n',
      ),
    )
    expect(result.errors).toEqual([])
    expect(result.appliedCount).toBe(3)
    const key12 = buildPriceRowKey(CATALOG[0]) as string
    const key14 = buildPriceRowKey(CATALOG[2]) as string
    expect(result.state.cells['安徽富鑫'][key12].price).toBe(3220)
    expect(result.state.cells['安徽富鑫'][key14].price).toBeNull()
    expect(
      result.state.cells['安徽富鑫'][buildPriceRowKey(CATALOG[3]) as string]
        .price,
    ).toBe(0)
    // 其它品牌列不受影响
    expect(result.state.cells['萍钢']).toBeUndefined()
  })

  it('目标品牌不存在时先建列再写入', () => {
    const result = applyMatrixPaste(
      buildState(),
      '武钢汉钢',
      '抗震钢E\t12\t9米\t1',
    )
    expect(result.state.brandOrder).toContain('武钢汉钢')
    expect(result.appliedCount).toBe(1)
  })

  it('5 列带类别、多余空行与多余列容错', () => {
    const result = applyMatrixPaste(
      buildState(),
      '安徽富鑫',
      ['螺纹钢\t抗震钢E\t12\t12米\t3300\t备注会被忽略', '', '   '].join('\n'),
    )
    expect(result.errors).toEqual([])
    expect(
      result.state.cells['安徽富鑫'][buildPriceRowKey(CATALOG[1]) as string]
        .price,
    ).toBe(3300)
  })

  it('格式错误逐行提示且不写入脏数据', () => {
    const result = applyMatrixPaste(
      buildState(),
      '安徽富鑫',
      [
        '抗震钢E\t0\t9米\t3220',
        '抗震钢E\tabc\t9米\t3220',
        '抗震钢E\t16\t9米\t3220',
        '抗震钢E\t12\t9米\tabc',
        '抗震钢E\t12',
      ].join('\n'),
    )
    expect(result.appliedCount).toBe(0)
    expect(result.errors.map((error) => error.line)).toEqual([1, 2, 3, 4, 5])
    expect(result.errors[0].message).toBe('规格必须是正整数')
    expect(result.errors[2].message).toContain('没有匹配的固定行')
    expect(result.errors[3].message).toContain('单价必须是数字')
    expect(result.errors[4].message).toContain('列数不足')
    expect(result.state.cells['安徽富鑫']).toBeUndefined()
  })

  it('粘贴清空已有报价时计数并可被二次确认拦截', () => {
    const withPrice = applyBrandItems(buildState(), '安徽富鑫', [item()])
    const result = applyMatrixPaste(withPrice, '安徽富鑫', '抗震钢E\t12\t9米\t')
    expect(result.clearedCount).toBe(1)
    expect(
      result.state.cells['安徽富鑫'][buildPriceRowKey(CATALOG[0]) as string]
        .price,
    ).toBeNull()
  })
})

describe('变更检出', () => {
  it('未改动的矩阵指纹稳定，改价后仅该品牌列变脏', () => {
    const state = buildState()
    const signature = matrixSignature(state)
    expect(dirtyBrandNames(state, signature)).toEqual([])
    const key = buildPriceRowKey(CATALOG[0]) as string
    const changed = updateMatrixCell(state, '萍钢', key, { price: 1 })
    expect(dirtyBrandNames(changed, signature)).toEqual(['萍钢'])
    expect(matrixSignature(state)).toBe(signature)
  })

  it('行标识包含类别/材质/规格/长度', () => {
    expect(describePriceRow(CATALOG[0])).toBe('螺纹钢 抗震钢E Φ12 9米')
  })
})
