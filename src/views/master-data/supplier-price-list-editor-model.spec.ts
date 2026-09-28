import { describe, expect, it } from 'vitest'
import type {
  SupplierPriceListItem,
  SupplierPriceSpecCatalogEntry,
} from '@/api/master/supplier-price-lists'
import { zhCN } from '@/locales/zh-CN'
import {
  applyTsvPaste,
  buildAdjustmentPreview,
  buildCatalogRows,
  buildPriceListPayload,
  buildPriceRowKey,
  computeDraftStats,
  describePriceRow,
  filterPriceRows,
  isAdjustmentAmountValid,
  normalizeSpecNumber,
  PRICE_ITEM_STATUS_I18N_KEYS,
  PRICE_ITEM_STATUS_ORDER,
  PRICE_ITEM_STATUS_ZH_LABELS,
  type PriceDraftRow,
  parsePriceCellText,
  validatePriceRows,
} from './supplier-price-list-editor-model'

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

function buildRows(
  catalog: SupplierPriceSpecCatalogEntry[] = CATALOG,
  priorItems: SupplierPriceListItem[] = [],
): PriceDraftRow[] {
  return buildCatalogRows(catalog, priorItems).rows
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
    expect(PRICE_ITEM_STATUS_ZH_LABELS).toEqual({
      NORMAL: '正常',
      PENDING: '在途待卸',
      BUNDLED: '搭配',
      NEGOTIABLE: '价格单议',
      OUT_OF_STOCK: '无货',
    })
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

  it('提交载荷保留 null 与 0 的区别', () => {
    const rows = buildRows()
    rows[0].price = null
    rows[0].priceStatus = 'NEGOTIABLE'
    rows[1].price = 0
    rows[2].price = 3220
    const payload = buildPriceListPayload(
      {
        supplierId: '1234567890123456789',
        brandName: '安徽富鑫',
        releasedAt: '2026-09-28T14:35:00',
        effectiveFrom: '2026-09-28',
        effectiveTo: null,
        warehouse: '钢联新安库',
        remark: null,
      },
      rows,
    )
    expect(payload.items.map((item) => item.price)).toEqual([null, 0, 3220])
    expect(payload.items[0].priceStatus).toBe('NEGOTIABLE')
    // 完全默认的行 (空价 + NORMAL + 无备注) 不落库, 避免把「不报价」写成条目
    expect(payload.items).toHaveLength(3)
  })

  it('整版留空时提交空 items（等价今日无报价）', () => {
    const payload = buildPriceListPayload(
      {
        supplierId: '9',
        brandName: '富鑫',
        releasedAt: '2026-09-28T14:35:00',
        effectiveFrom: '2026-09-28',
        effectiveTo: null,
        warehouse: null,
        remark: null,
      },
      buildRows(),
    )
    expect(payload.items).toEqual([])
  })
})

describe('行级校验', () => {
  it('规格非正整数与负单价给出行级错误', () => {
    const rows = buildRows()
    rows[0].spec = 0
    rows[1].price = -1
    const errors = validatePriceRows(rows)
    expect(errors.get(rows[0].uid)?.spec).toBe('规格必须为正整数')
    expect(errors.get(rows[1].uid)?.price).toBe('单价不得为负')
  })

  it('同一 材质+规格+长度 重复时两行都给重复错误', () => {
    const rows = buildRows([CATALOG[0], { ...CATALOG[0], sortOrder: 9 }])
    const errors = validatePriceRows(rows)
    expect(errors.size).toBe(2)
    for (const row of rows) {
      expect(errors.get(row.uid)?.duplicate).toBe(
        '同一材质+规格+长度的条目重复',
      )
    }
  })

  it('无错误时不返回任何行条目', () => {
    expect(validatePriceRows(buildRows()).size).toBe(0)
  })
})

describe('固定行生成与旧版本带价', () => {
  it('按规格全集固定行并带出上一版本价格/状态/备注', () => {
    // 后端历史上可能返回字符串规格（md_material.spec 为 varchar），这里刻意用字符串验证归一化
    const prior = [
      {
        id: '1900000000000000011',
        category: '螺纹钢',
        material: '抗震钢E',
        spec: 12,
        length: '9米',
        price: 3220,
        priceStatus: 'NORMAL',
        remark: '含税',
        sortOrder: 0,
      },
      {
        id: '1900000000000000012',
        category: '盘螺',
        material: '盘螺400E',
        spec: '8',
        length: '',
        price: null,
        priceStatus: 'OUT_OF_STOCK',
        remark: null,
        sortOrder: 3,
      },
    ] as unknown as SupplierPriceListItem[]
    const result = buildCatalogRows(CATALOG, prior)

    expect(result.rows).toHaveLength(4)
    expect(result.rows[0].price).toBe(3220)
    expect(result.rows[0].itemId).toBe('1900000000000000011')
    expect(result.rows[0].remark).toBe('含税')
    expect(result.rows[1].price).toBeNull()
    expect(result.rows[3].priceStatus).toBe('OUT_OF_STOCK')
    expect(result.unmatchedPriorItems).toEqual([])
  })

  it('规格全集外的旧条目不被静默丢弃，单独回报', () => {
    const prior: SupplierPriceListItem[] = [
      {
        id: '1900000000000000099',
        category: '螺纹钢',
        material: '已停产材质',
        spec: 40,
        length: '9米',
        price: 100,
        priceStatus: 'NORMAL',
        remark: null,
        sortOrder: 9,
      },
    ]
    const result = buildCatalogRows(CATALOG, prior)
    expect(result.rows.every((row) => row.price === null)).toBe(true)
    expect(result.unmatchedPriorItems).toHaveLength(1)
    expect(result.unmatchedPriorItems[0].id).toBe('1900000000000000099')
  })

  it('规格无法归一化的全集脏行被跳过并计数', () => {
    const result = buildCatalogRows([
      ...CATALOG,
      {
        category: '螺纹钢',
        material: '脏数据',
        spec: 'abc',
        length: '9米',
        sortOrder: 4,
      } as unknown as SupplierPriceSpecCatalogEntry,
    ])
    expect(result.rows).toHaveLength(4)
    expect(result.invalidCatalogCount).toBe(1)
  })
})

describe('整体加减预览', () => {
  it('跳过不报价条目并给出前后价', () => {
    const rows = buildRows(CATALOG, [
      {
        id: '1',
        category: '螺纹钢',
        material: '抗震钢E',
        spec: 12,
        length: '9米',
        price: 3220,
        priceStatus: 'NORMAL',
        remark: null,
        sortOrder: 0,
      },
    ])
    rows[0].itemId = '1900000000000000011'
    rows[0].price = 3220

    const preview = buildAdjustmentPreview(rows, 'ADD', 50)
    expect(preview.affectedCount).toBe(1)
    expect(preview.skippedCount).toBe(3)
    expect(preview.rows[0]).toMatchObject({
      itemId: '1900000000000000011',
      priceBefore: 3220,
      priceAfter: 3270,
      label: '螺纹钢 抗震钢E Φ12 9米',
    })
    expect(preview.negativeKeys).toEqual([])
    expect(preview.unsavedCount).toBe(0)
  })

  it('减价后为负的条目标记为 negative 且不静默截断', () => {
    const rows = buildRows()
    rows[0].itemId = '1'
    rows[0].price = 30
    const preview = buildAdjustmentPreview(rows, 'SUBTRACT', 50)
    expect(preview.negativeKeys).toEqual([rows[0].key])
    expect(preview.rows[0].priceAfter).toBe(-20)
  })

  it('未保存的新价条目不计入整体加减', () => {
    const rows = buildRows()
    rows[0].price = 100
    const preview = buildAdjustmentPreview(rows, 'ADD', 10)
    expect(preview.affectedCount).toBe(0)
    expect(preview.unsavedCount).toBe(1)
  })

  it('金额必须为正数', () => {
    expect(isAdjustmentAmountValid(50)).toBe(true)
    expect(isAdjustmentAmountValid(0)).toBe(false)
    expect(isAdjustmentAmountValid(-1)).toBe(false)
    expect(isAdjustmentAmountValid(null)).toBe(false)
  })
})

describe('TSV 粘贴导入', () => {
  it('按 材质/规格/长度/单价 对齐固定行，单价为空写入「不报价」而非 0', () => {
    const rows = buildRows()
    const result = applyTsvPaste(
      rows,
      ['抗震钢E\t12\t9米\t3220', '抗震钢E\t14\t9米\t', '盘螺400E\t8\t\t0'].join(
        '\n',
      ),
    )
    expect(result.errors).toEqual([])
    expect(result.appliedCount).toBe(3)
    const filled = result.rows.filter((row) => row.price !== null)
    expect(filled.find((row) => row.spec === 12)?.price).toBe(3220)
    expect(
      result.rows.find((row) => row.material === '抗震钢E' && row.spec === 14)
        ?.price,
    ).toBeNull()
    expect(result.rows.find((row) => row.material === '盘螺400E')?.price).toBe(
      0,
    )
  })

  it('支持 5 列（带类别）与多余空行/多余列容错', () => {
    const result = applyTsvPaste(
      buildRows(),
      ['螺纹钢\t抗震钢E\t12\t12米\t3300\t备注会被忽略', '', '   '].join('\n'),
    )
    expect(result.errors).toEqual([])
    expect(
      result.rows.find((row) => row.spec === 12 && row.length === '12米')
        ?.price,
    ).toBe(3300)
  })

  it('格式错误逐行提示且不写入脏数据', () => {
    const result = applyTsvPaste(
      buildRows(),
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
    expect(result.rows.every((row) => row.price === null)).toBe(true)
  })

  it('无类别列且同材质+规格+长度有多条类别时拒绝写入', () => {
    const catalog: SupplierPriceSpecCatalogEntry[] = [
      {
        category: '螺纹钢',
        material: '同规格',
        spec: 12,
        length: '9米',
        sortOrder: 0,
      },
      {
        category: '盘螺',
        material: '同规格',
        spec: 12,
        length: '9米',
        sortOrder: 1,
      },
    ]
    const result = applyTsvPaste(buildRows(catalog), '同规格\t12\t9米\t100')
    expect(result.appliedCount).toBe(0)
    expect(result.errors[0].message).toContain('类别')
  })

  it('粘贴清空已有报价时计数并可被二次确认拦截', () => {
    const rows = buildRows()
    rows[0].price = 3220
    const result = applyTsvPaste(rows, '抗震钢E\t12\t9米\t')
    expect(result.clearedCount).toBe(1)
    expect(result.rows[0].price).toBeNull()
  })
})

describe('筛选与统计', () => {
  it('只看已填/未填与关键字筛选', () => {
    const rows = buildRows()
    rows[0].price = 100
    expect(filterPriceRows(rows, { fill: 'FILLED' })).toHaveLength(1)
    expect(filterPriceRows(rows, { fill: 'UNFILLED' })).toHaveLength(3)
    expect(filterPriceRows(rows, { keyword: 'Φ8' })).toHaveLength(1)
    expect(
      filterPriceRows(rows, { category: '螺纹钢', material: '抗震钢E' }),
    ).toHaveLength(3)
  })

  it('统计固定行数/已填/未填与状态计数', () => {
    const rows = buildRows()
    rows[0].price = 0
    rows[0].priceStatus = 'PENDING'
    const stats = computeDraftStats(rows)
    expect(stats.total).toBe(4)
    expect(stats.filled).toBe(1)
    expect(stats.empty).toBe(3)
    expect(stats.statusCounts.PENDING).toBe(1)
    expect(stats.statusCounts.NORMAL).toBe(3)
  })

  it('行标识包含类别/材质/规格/长度', () => {
    expect(describePriceRow(CATALOG[0])).toBe('螺纹钢 抗震钢E Φ12 9米')
  })
})
