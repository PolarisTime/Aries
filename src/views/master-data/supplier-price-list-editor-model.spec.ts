import { describe, expect, it } from 'vitest'
import type {
  SupplierPriceListItem,
  SupplierPriceListSummary,
  SupplierPriceSpecCatalogEntry,
} from '@/api/master/supplier-price-lists'
import { zhCN } from '@/locales/zh-CN'
import {
  addSupplierColumn,
  applyColumnItems,
  applyMatrixPaste,
  buildMatrixAdjustmentPreview,
  buildMatrixState,
  buildPriceRowKey,
  buildReplaceItems,
  computeMatrixStats,
  countFilledForColumn,
  describePriceColumn,
  describePriceRow,
  dirtySupplierIds,
  filterMatrixRows,
  formatUpdatedAt,
  isAdjustmentAmountValid,
  matrixSignature,
  normalizeSpecNumber,
  PRICE_ITEM_STATUS_I18N_KEYS,
  PRICE_ITEM_STATUS_ORDER,
  PRICE_ITEM_STATUS_ZH_LABELS,
  type PriceMatrixState,
  parseBlockPasteLayout,
  parsePriceCellText,
  previewBlockPaste,
  removeSupplierColumn,
  updateMatrixCell,
  validateMatrixRows,
  wouldPriceGoNegative,
} from './supplier-price-list-editor-model'

const BRAND = '安徽富鑫'
const SUPPLIER_A = '1000000000000000001'
const SUPPLIER_B = '1000000000000000002'
const LIST_A = '1900000000000000001'
const LIST_B = '1900000000000000002'

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
  supplierId: string,
  overrides: Partial<SupplierPriceListSummary> = {},
): SupplierPriceListSummary {
  return {
    id: supplierId === SUPPLIER_A ? LIST_A : LIST_B,
    supplierId,
    supplierName: supplierId === SUPPLIER_A ? '杭州中金钢铁' : '浙江铁都钢材',
    brandName: BRAND,
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

/**
 * 品牌视图矩阵：品牌 = 页级标签，列 = 供应商。
 * fixture 里同一品牌只有 A 有价格表，B 由 extraSuppliers 追加为空列。
 */
function buildState(): PriceMatrixState {
  return buildMatrixState({
    brandName: BRAND,
    catalog: CATALOG,
    lists: [listSummary(SUPPLIER_A)],
    extraSuppliers: [{ supplierId: SUPPLIER_B, supplierName: '浙江铁都钢材' }],
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

describe('矩阵构建（品牌视图：列 = 供应商）', () => {
  it('行来自规格全集，列 = 该品牌已有价格表的供应商 ∪ 追加供应商', () => {
    const state = buildState()
    expect(state.brandName).toBe(BRAND)
    expect(state.rows).toHaveLength(4)
    expect(state.columnOrder).toEqual([SUPPLIER_A, SUPPLIER_B])
    expect(state.columns[SUPPLIER_A].listId).toBe(LIST_A)
    expect(state.columns[SUPPLIER_A].supplierName).toBe('杭州中金钢铁')
    expect(state.columns[SUPPLIER_B].listId).toBeNull()
    expect(state.invalidCatalogCount).toBe(0)
    expect(describePriceColumn(state.columns[SUPPLIER_A])).toBe('杭州中金钢铁')
  })

  it('只收同品牌的现表：别的品牌不进当前视图', () => {
    const state = buildMatrixState({
      brandName: BRAND,
      catalog: CATALOG,
      lists: [
        listSummary(SUPPLIER_A),
        listSummary(SUPPLIER_B, { brandName: '萍钢' }),
      ],
    })
    expect(state.columnOrder).toEqual([SUPPLIER_A])
  })

  it('空品牌视图不生成列，且规格行仍固定', () => {
    const state = buildMatrixState({
      brandName: '  ',
      catalog: CATALOG,
      lists: [listSummary(SUPPLIER_A)],
    })
    expect(state.columnOrder).toEqual([])
    expect(state.rows).toHaveLength(4)
  })

  it('规格无法归一化或归一化后重复的行只保留一条并计数脏行', () => {
    const state = buildMatrixState({
      brandName: BRAND,
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
    const state = applyColumnItems(buildState(), SUPPLIER_A, [
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
    expect(state.cells[SUPPLIER_A][key12].price).toBe(3220)
    expect(state.cells[SUPPLIER_A][key12].itemId).toBe('1900000000000000011')
    expect(state.cells[SUPPLIER_A][key14].price).toBeNull()
    expect(state.cells[SUPPLIER_A][key14].priceStatus).toBe('OUT_OF_STOCK')
    expect(state.cells[SUPPLIER_A][key14].remark).toBe('无货')
  })
})

describe('供应商列增删与单元格写入', () => {
  it('添加/移除供应商列不影响其它列，重复添加幂等', () => {
    const added = addSupplierColumn(buildState(), {
      supplierId: '1000000000000000003',
      supplierName: ' 武钢汉钢 ',
    })
    expect(added.columnOrder).toEqual([
      SUPPLIER_A,
      SUPPLIER_B,
      '1000000000000000003',
    ])
    expect(added.columns['1000000000000000003'].supplierName).toBe('武钢汉钢')
    expect(
      addSupplierColumn(added, {
        supplierId: '1000000000000000003',
        supplierName: '武钢汉钢',
      }).columnOrder,
    ).toEqual(added.columnOrder)
    const removed = removeSupplierColumn(added, '1000000000000000003')
    expect(removed.columnOrder).toEqual([SUPPLIER_A, SUPPLIER_B])
    expect(removed.columns['1000000000000000003']).toBeUndefined()
  })

  it('单元格写入只改目标列，未知/空供应商 ID 不写', () => {
    const key = buildPriceRowKey(CATALOG[0]) as string
    const next = updateMatrixCell(buildState(), SUPPLIER_B, key, {
      price: 3300,
    })
    expect(next.cells[SUPPLIER_B][key].price).toBe(3300)
    expect(next.cells[SUPPLIER_A]).toEqual({})
    expect(updateMatrixCell(next, '', key, { price: 1 })).toBe(next)
    expect(updateMatrixCell(next, '999', key, { price: 1 })).toBe(next)
  })
})

describe('全量替换载荷守卫', () => {
  it('服务端已有条目（含 price 为 null）必须保留，本地新填只带非空价', () => {
    const state = applyColumnItems(buildState(), SUPPLIER_A, [
      item({ price: null }),
      item({ id: '1900000000000000013', spec: 14, length: '9米', price: null }),
    ])
    const key12 = buildPriceRowKey(CATALOG[0]) as string
    const next = updateMatrixCell(state, SUPPLIER_A, key12, { price: 3300 })
    const items = buildReplaceItems(next, SUPPLIER_A)
    expect(items).toHaveLength(2)
    expect(items[0].price).toBe(3300)
    expect(items[1].price).toBeNull()
    expect(items[1].length).toBe('9米')
  })

  it('规格全集外的历史脏键条目通过 preservedItems 保留，不被静默删除', () => {
    const state = buildState()
    const key = buildPriceRowKey(CATALOG[0]) as string
    const next = updateMatrixCell(state, SUPPLIER_A, key, { price: 3300 })
    const items = buildReplaceItems(next, SUPPLIER_A, [
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

  it('空价新行不落库：全空供应商列提交空 items', () => {
    expect(buildReplaceItems(buildState(), SUPPLIER_B)).toEqual([])
  })

  it('itemId 存在但价为 null 的条目仍然提交（表达「不报价」）', () => {
    const state = applyColumnItems(buildState(), SUPPLIER_A, [
      item({ price: null }),
    ])
    const items = buildReplaceItems(state, SUPPLIER_A)
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

  it('统计行数/供应商列数/已填与未填', () => {
    const key = buildPriceRowKey(CATALOG[0]) as string
    const state = updateMatrixCell(buildState(), SUPPLIER_A, key, { price: 0 })
    const stats = computeMatrixStats(state)
    expect(stats.totalRows).toBe(4)
    expect(stats.columnCount).toBe(2)
    // 0 元是真实报价，必须计入已填
    expect(stats.filledTotal).toBe(1)
    expect(stats.emptyTotal).toBe(7)
    expect(countFilledForColumn(state, SUPPLIER_B)).toBe(0)
    expect(formatUpdatedAt(stats.updatedAt)).toBe('2026-09-28 14:35')
  })
})

describe('筛选', () => {
  it('按供应商筛选已填/未填，未指定供应商时按任一供应商已填', () => {
    const key = buildPriceRowKey(CATALOG[0]) as string
    const state = updateMatrixCell(buildState(), SUPPLIER_A, key, { price: 1 })
    expect(
      filterMatrixRows(state, { fill: 'FILLED', fillSupplierId: SUPPLIER_A }),
    ).toHaveLength(1)
    expect(
      filterMatrixRows(state, { fill: 'FILLED', fillSupplierId: SUPPLIER_B }),
    ).toHaveLength(0)
    expect(filterMatrixRows(state, { fill: 'FILLED' })).toHaveLength(1)
    expect(filterMatrixRows(state, { fill: 'UNFILLED' })).toHaveLength(3)
    expect(filterMatrixRows(state, { keyword: 'Φ8' })).toHaveLength(1)
    expect(
      filterMatrixRows(state, { category: '螺纹钢', material: '抗震钢E' }),
    ).toHaveLength(3)
  })
})

describe('整体加减预览（按供应商+品牌单表）', () => {
  function stateWithPrices(): PriceMatrixState {
    // A 列：12/9米 有价 3220、8 盘螺 有价 25（减 100 会变负）
    const state = applyColumnItems(buildState(), SUPPLIER_A, [
      item(),
      item({
        id: '1900000000000000013',
        category: '盘螺',
        material: '盘螺400E',
        spec: 8,
        length: '',
        price: 25,
        sortOrder: 3,
      }),
    ])
    // A 列再补一条本地新填（无 itemId）用于 unsaved 断言
    const key12m = buildPriceRowKey(CATALOG[1]) as string
    return updateMatrixCell(state, SUPPLIER_A, key12m, { price: 3100 })
  }

  it('只作用于目标列：跳过不报价条目、给出前后价与目标价格表', () => {
    const preview = buildMatrixAdjustmentPreview(
      stateWithPrices(),
      SUPPLIER_A,
      'ADD',
      50,
    )
    expect(preview.target).toEqual({ supplierId: SUPPLIER_A, listId: LIST_A })
    expect(preview.itemIds).toEqual([
      '1900000000000000011',
      '1900000000000000013',
    ])
    expect(preview.affectedCount).toBe(2)
    expect(preview.rows[0].label).toBe('杭州中金钢铁 螺纹钢 抗震钢E Φ12 9米')
    expect(preview.rows[0].priceAfter).toBe(3270)
    expect(preview.unsavedCount).toBe(1)
    expect(preview.skippedCount).toBeGreaterThan(0)
    expect(preview.negativeLabels).toEqual([])
    expect(preview.missingList).toBe(false)
  })

  it('减价后为负的条目标记为 negative 且不静默截断', () => {
    const preview = buildMatrixAdjustmentPreview(
      stateWithPrices(),
      SUPPLIER_A,
      'SUBTRACT',
      100,
    )
    expect(preview.negativeLabels).toEqual(['杭州中金钢铁 盘螺 盘螺400E Φ8'])
    expect(preview.rows.some((row) => row.priceAfter < 0)).toBe(true)
    expect(wouldPriceGoNegative(30, 'SUBTRACT', 100)).toBe(true)
    expect(wouldPriceGoNegative(30, 'SUBTRACT', 30)).toBe(false)
  })

  it('尚无价格表的供应商列回报 missingList 且没有可执行计划', () => {
    const key = buildPriceRowKey(CATALOG[0]) as string
    const state = updateMatrixCell(buildState(), SUPPLIER_B, key, { price: 9 })
    const preview = buildMatrixAdjustmentPreview(state, SUPPLIER_B, 'ADD', 50)
    expect(preview.missingList).toBe(true)
    expect(preview.target).toBeNull()
    expect(preview.affectedCount).toBe(0)
  })

  it('金额必须为正数', () => {
    expect(isAdjustmentAmountValid(50)).toBe(true)
    expect(isAdjustmentAmountValid(0)).toBe(false)
    expect(isAdjustmentAmountValid(-1)).toBe(false)
    expect(isAdjustmentAmountValid(null)).toBe(false)
  })
})

describe('TSV 粘贴（指定供应商列）', () => {
  it('按 材质/规格/长度/单价 对齐固定行，落进目标供应商列', () => {
    const result = applyMatrixPaste(
      buildState(),
      SUPPLIER_A,
      ['抗震钢E\t12\t9米\t3220', '抗震钢E\t14\t9米\t', '盘螺400E\t8\t\t0'].join(
        '\n',
      ),
    )
    expect(result.errors).toEqual([])
    expect(result.appliedCount).toBe(3)
    const key12 = buildPriceRowKey(CATALOG[0]) as string
    const key14 = buildPriceRowKey(CATALOG[2]) as string
    expect(result.state.cells[SUPPLIER_A][key12].price).toBe(3220)
    expect(result.state.cells[SUPPLIER_A][key14].price).toBeNull()
    expect(
      result.state.cells[SUPPLIER_A][buildPriceRowKey(CATALOG[3]) as string]
        .price,
    ).toBe(0)
    // 其它供应商列不受影响
    expect(result.state.cells[SUPPLIER_B]).toEqual({})
  })

  it('5 列带类别、多余空行与多余列容错', () => {
    const result = applyMatrixPaste(
      buildState(),
      SUPPLIER_A,
      ['螺纹钢\t抗震钢E\t12\t12米\t3300\t备注会被忽略', '', '   '].join('\n'),
    )
    expect(result.errors).toEqual([])
    expect(
      result.state.cells[SUPPLIER_A][buildPriceRowKey(CATALOG[1]) as string]
        .price,
    ).toBe(3300)
  })

  it('格式错误逐行提示且不写入脏数据', () => {
    const result = applyMatrixPaste(
      buildState(),
      SUPPLIER_A,
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
    expect(result.state.cells[SUPPLIER_A]).toEqual({})
  })

  it('粘贴清空已有报价时计数并可被二次确认拦截', () => {
    const withPrice = applyColumnItems(buildState(), SUPPLIER_A, [item()])
    const result = applyMatrixPaste(withPrice, SUPPLIER_A, '抗震钢E\t12\t9米\t')
    expect(result.clearedCount).toBe(1)
    expect(
      result.state.cells[SUPPLIER_A][buildPriceRowKey(CATALOG[0]) as string]
        .price,
    ).toBeNull()
  })
})

describe('整块粘贴（供应商 × 规格）', () => {
  const BLOCK = [
    '供应商\t材质\t规格\t长度\t单价',
    '杭州中金钢铁\t抗震钢E\t12\t9米\t3220',
    '浙江铁都钢材\t抗震钢E\t12\t9米\t3180',
    '不存在的供应商\t抗震钢E\t12\t9米\t1',
  ].join('\n')

  it('按供应商名拆列，跳过表头与未知供应商', () => {
    const layout = parseBlockPasteLayout(BLOCK, [
      { supplierId: SUPPLIER_A, supplierName: '杭州中金钢铁' },
      { supplierId: SUPPLIER_B, supplierName: '浙江铁都钢材' },
    ])
    expect(layout.columns.map((column) => column.supplierId)).toEqual([
      SUPPLIER_A,
      SUPPLIER_B,
    ])
    expect(layout.unknownSupplierNames).toEqual(['不存在的供应商'])
  })

  it('预览不改状态，写入时逐列落到各（供应商, 品牌）价格表', () => {
    const state = buildState()
    const preview = previewBlockPaste(state, BLOCK)
    expect(preview.appliedCount).toBe(2)
    expect(preview.unknownSupplierNames).toEqual(['不存在的供应商'])
    // 预览是纯读：原状态不被改写
    expect(state.cells[SUPPLIER_A]).toEqual({})

    const layout = parseBlockPasteLayout(BLOCK, [
      { supplierId: SUPPLIER_A, supplierName: '杭州中金钢铁' },
      { supplierId: SUPPLIER_B, supplierName: '浙江铁都钢材' },
    ])
    let next = state
    for (const column of layout.columns) {
      next = applyMatrixPaste(next, column.supplierId, column.text).state
    }
    const key = buildPriceRowKey(CATALOG[0]) as string
    expect(next.cells[SUPPLIER_A][key].price).toBe(3220)
    expect(next.cells[SUPPLIER_B][key].price).toBe(3180)
  })
})

describe('变更检出', () => {
  it('未改动的矩阵指纹稳定，改价后仅该供应商列变脏', () => {
    const state = buildState()
    const signature = matrixSignature(state)
    expect(dirtySupplierIds(state, signature)).toEqual([])
    const key = buildPriceRowKey(CATALOG[0]) as string
    const changed = updateMatrixCell(state, SUPPLIER_B, key, { price: 1 })
    expect(dirtySupplierIds(changed, signature)).toEqual([SUPPLIER_B])
    expect(matrixSignature(state)).toBe(signature)
  })

  it('行标识包含类别/材质/规格/长度', () => {
    expect(describePriceRow(CATALOG[0])).toBe('螺纹钢 抗震钢E Φ12 9米')
  })
})
