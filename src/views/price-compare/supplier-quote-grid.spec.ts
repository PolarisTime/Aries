import { describe, expect, it } from 'vitest'
import type { QuoteRow } from './supplier-price-list-model'
import {
  applyBrandOrder,
  buildBasePriceColumnPrices,
  buildBasePriceFillPlan,
  buildCategoryMatrices,
  buildMatrixPastePlan,
  buildMatrixSlots,
  buildSheetMatrix,
  filterSpecRows,
  groupSpecRows,
  isRealLength,
  lengthRank,
  matrixCellKeyOf,
  matrixLengthsOf,
  matrixMaterialsOf,
  orderedLengths,
  parseBrandPrefs,
  parseClipboardGrid,
  parseFixedColumnKeys,
  parseGridPrice,
  reorderBrands,
  roundPrice,
  rowKeyOfCell,
  SHEET_COLUMN_WIDTH,
  SHEET_FIXED_COLUMNS,
  type SpecRow,
  serializeBrandPrefs,
  sheetWidthOf,
  shiftBrand,
  specRowGroupSpans,
  specRowKey,
  toggleHidden,
} from './supplier-quote-grid'

const row = (spec: number, length: string, material = 'HRB400E'): QuoteRow => ({
  category: '螺纹钢',
  material,
  spec,
  length,
})

describe('Excel 剪贴板解析', () => {
  it('按行/制表符切分，并去掉末尾空行', () => {
    expect(parseClipboardGrid('3280\t3290\n3300\t3310\n')).toEqual([
      ['3280', '3290'],
      ['3300', '3310'],
    ])
  })

  it('兼容 CRLF 与单元格内空格', () => {
    expect(parseClipboardGrid(' 3280 \r\n 3290 \r\n')).toEqual([
      ['3280'],
      ['3290'],
    ])
  })

  it('空文本不产生矩阵', () => {
    expect(parseClipboardGrid('   ')).toEqual([])
  })
})

describe('价格解析：空串=清空、非法=丢弃', () => {
  it('空串表示清空', () => {
    expect(parseGridPrice('')).toBeNull()
    expect(parseGridPrice('  ')).toBeNull()
  })

  it('支持千分位与小数', () => {
    expect(parseGridPrice('3,280.50')).toBe(3280.5)
  })

  it('负数与非数字返回 undefined', () => {
    expect(parseGridPrice('-1')).toBeUndefined()
    expect(parseGridPrice('abc')).toBeUndefined()
  })
})

describe('定尺排序：9米 在 12米 左边，无定尺排最后', () => {
  it('按报价单习惯排序，而不是按字符串', () => {
    expect(lengthRank('9米')).toBeLessThan(lengthRank('12米'))
    expect(lengthRank('12米')).toBeLessThan(lengthRank(''))
    expect(lengthRank('')).toBeLessThan(lengthRank('-'))
  })

  it('去重后排序', () => {
    expect(
      orderedLengths([
        row(12, '12米'),
        row(10, '9米'),
        row(12, '9米'),
        row(8, ''),
      ]),
    ).toEqual(['9米', '12米', ''])
  })
})

describe('规格行合并：一个规格一行，定尺进格子', () => {
  it('同一规格的 9米/12米 合并成一行、内含两个定尺', () => {
    const grouped = groupSpecRows([
      row(12, '12米'),
      row(12, '9米'),
      row(14, '9米'),
    ])
    expect(grouped).toHaveLength(2)
    expect(grouped[0]).toEqual({
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      lengths: ['9米', '12米'],
    })
    expect(grouped[1]?.lengths).toEqual(['9米'])
  })

  it('按类别/材质/规格排序，规格是数值序（不是 "10" < "9"）', () => {
    const grouped = groupSpecRows([
      row(12, '9米'),
      row(9, '9米'),
      row(10, '9米'),
    ])
    expect(grouped.map((item) => item.spec)).toEqual([9, 10, 12])
  })

  it('规格行键不含定尺（同一规格的 9米/12米 是同一行）', () => {
    expect(
      specRowKey({
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        lengths: [],
      }),
    ).toBe('螺纹钢|HRB400E|12')
    expect(
      rowKeyOfCell(
        { category: '螺纹钢', material: 'HRB400E', spec: 12, lengths: [] },
        '9米',
      ),
    ).toBe('螺纹钢|HRB400E|12|9米')
  })
})

describe('规格搜索', () => {
  const rows = groupSpecRows([row(12, '9米'), row(12, '9米', 'HPB300')])

  it('材质/规格/类别都能命中，忽略大小写', () => {
    expect(filterSpecRows(rows, 'hpb300')).toHaveLength(1)
    expect(filterSpecRows(rows, '12')).toHaveLength(2)
    expect(filterSpecRows(rows, '  ')).toHaveLength(2)
  })
})

describe('材质进表头的矩阵：行 = 类别+规格，列 = 品牌×材质×定尺', () => {
  const specRows: SpecRow[] = [
    { category: '螺纹钢', material: 'HRB400', spec: 12, lengths: ['9米'] },
    { category: '螺纹钢', material: 'HRB400', spec: 14, lengths: ['9米'] },
    {
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      lengths: ['9米', '12米'],
    },
    { category: '盘螺', material: 'HRB400', spec: 8, lengths: ['-'] },
  ]

  it('真实定尺判据：9米/12米 是定尺，空串与 - 不是', () => {
    expect(isRealLength('9米')).toBe(true)
    expect(isRealLength('12米')).toBe(true)
    expect(isRealLength('-')).toBe(false)
    expect(isRealLength('')).toBe(false)
  })

  it('分组只认商品类别字段，不按定尺反推', () => {
    // 故意造两条"反直觉"的数据：盘螺却有定尺、直条却没有定尺。
    // 归类必须只看 category（商品资料字段），不能靠"有没有定尺"去猜。
    const odd: SpecRow[] = [
      { category: '盘螺', material: 'HRB400', spec: 8, lengths: ['9米'] },
      { category: '直条', material: 'HRB400', spec: 12, lengths: ['-'] },
    ]
    const matrices = buildCategoryMatrices(odd)
    // 顺序按报价习惯（盘螺在前），但每张表只装自己类别下的行
    expect(matrices.map((matrix) => matrix.category)).toEqual(['盘螺', '直条'])
    expect(matrices[0].rows[0].key).toBe('盘螺|8')
    expect(
      matrices[0].rows[0].cells.has(matrixCellKeyOf('HRB400', '9米')),
    ).toBe(true)
    expect(matrices[1].rows[0].key).toBe('直条|12')
    expect(matrices[1].rows[0].cells.has(matrixCellKeyOf('HRB400', '-'))).toBe(
      true,
    )
  })

  it('行按类别 + 规格升序；同一规格跨材质只有一行', () => {
    const rows = buildSheetMatrix(specRows)
    // 行序沿用报价习惯：盘螺在前，直条/螺纹按规格升序
    expect(rows.map((row) => `${row.category}/${row.spec}`)).toEqual([
      '盘螺/8',
      '螺纹钢/12',
      '螺纹钢/14',
    ])
  })

  it('单元格带完整行键（类别|材质|规格|定尺）；缺的组合没有键', () => {
    const rows = buildSheetMatrix(specRows)
    const spec12 = rows.find((row) => row.key === '螺纹钢|12')
    expect(spec12?.cells.get(matrixCellKeyOf('HRB400', '9米'))).toBe(
      '螺纹钢|HRB400|12|9米',
    )
    expect(spec12?.cells.get(matrixCellKeyOf('HRB400E', '12米'))).toBe(
      '螺纹钢|HRB400E|12|12米',
    )
    // HRB400 没有 12米
    expect(spec12?.cells.get(matrixCellKeyOf('HRB400', '12米'))).toBeUndefined()
  })

  it('材质与各材质的定尺列按报价习惯排序；无定尺返回占位值', () => {
    expect(matrixMaterialsOf(specRows)).toEqual(['HRB400', 'HRB400E'])
    expect(matrixLengthsOf(specRows, 'HRB400E')).toEqual(['9米', '12米'])
    expect(matrixLengthsOf(specRows, 'HRB400')).toContain('-')
  })

  it('格位顺序 = 品牌 × 材质 × 定尺（与界面 DOM 顺序一致）', () => {
    const slots = buildMatrixSlots(
      ['中天', '永钢'],
      ['HRB400', 'HRB400E'],
      (material) => (material === 'HRB400' ? ['9米'] : ['9米', '12米']),
    )
    expect(slots).toEqual([
      { brandName: '中天', material: 'HRB400', length: '9米' },
      { brandName: '中天', material: 'HRB400E', length: '9米' },
      { brandName: '中天', material: 'HRB400E', length: '12米' },
      { brandName: '永钢', material: 'HRB400', length: '9米' },
      { brandName: '永钢', material: 'HRB400E', length: '9米' },
      { brandName: '永钢', material: 'HRB400E', length: '12米' },
    ])
  })

  describe('粘贴', () => {
    const rows = buildSheetMatrix(specRows)
    const thread12 = rows.findIndex((row) => row.key === '螺纹钢|12')
    const thread14 = rows.findIndex((row) => row.key === '螺纹钢|14')
    const slots = buildMatrixSlots(
      ['中天'],
      ['HRB400', 'HRB400E'],
      (material) => (material === 'HRB400' ? ['9米', '12米'] : ['9米', '12米']),
    )

    it('贴一列：沿同一定尺向下填规格行', () => {
      const plan = buildMatrixPastePlan({
        matrix: [['3210'], ['3220']],
        slots,
        rows,
        startSlotIndex: 0,
        startRowIndex: thread12,
      })
      expect(plan.cells).toEqual([
        { brandName: '中天', rowKey: '螺纹钢|HRB400|12|9米', value: 3210 },
        { brandName: '中天', rowKey: '螺纹钢|HRB400|14|9米', value: 3220 },
      ])
      expect(plan.dropped).toBe(0)
    })

    it('贴一行：同一规格横向跨材质/定尺一次贴完', () => {
      const plan = buildMatrixPastePlan({
        matrix: [['3210', '3220', '3230', '3240']],
        slots,
        rows,
        startSlotIndex: 0,
        startRowIndex: thread12,
      })
      // 第 2 列是 HRB400 的 12米，但这个规格组合不存在 → 丢弃并计数，不写脏键
      expect(plan.cells).toEqual([
        { brandName: '中天', rowKey: '螺纹钢|HRB400|12|9米', value: 3210 },
        { brandName: '中天', rowKey: '螺纹钢|HRB400E|12|9米', value: 3230 },
        { brandName: '中天', rowKey: '螺纹钢|HRB400E|12|12米', value: 3240 },
      ])
      expect(plan.dropped).toBe(1)
    })

    it('目标格不存在（该材质没有这个定尺）时丢弃并计数', () => {
      const plan = buildMatrixPastePlan({
        // 第 2 行是螺纹钢/14：HRB400 没有 12米、HRB400E 也没有 14
        matrix: [['']],
        slots,
        rows,
        startSlotIndex: 1,
        startRowIndex: thread14,
      })
      expect(plan.cells).toEqual([])
      expect(plan.dropped).toBe(1)
    })

    it('空串粘贴=清空；越界丢弃', () => {
      const plan = buildMatrixPastePlan({
        matrix: [['']],
        slots,
        rows,
        startSlotIndex: 2,
        startRowIndex: thread12,
      })
      expect(plan.cells).toEqual([
        { brandName: '中天', rowKey: '螺纹钢|HRB400E|12|9米', value: null },
      ])
      expect(plan.dropped).toBe(0)

      const overflow = buildMatrixPastePlan({
        matrix: [['3210']],
        slots,
        rows,
        startSlotIndex: slots.length,
        startRowIndex: thread12,
      })
      expect(overflow.cells).toEqual([])
      expect(overflow.dropped).toBe(1)
    })
  })
})

describe('列显示偏好与顺序', () => {
  it('按保存的顺序排列，新增品牌追加末尾', () => {
    expect(applyBrandOrder(['中天', '永钢', '沙钢'], ['沙钢', '中天'])).toEqual(
      ['沙钢', '中天', '永钢'],
    )
  })

  it('拖拽重排/左右移', () => {
    expect(reorderBrands(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(shiftBrand(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(shiftBrand(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
  })

  it('隐藏/取消隐藏', () => {
    expect(toggleHidden([], '中天')).toEqual(['中天'])
    expect(toggleHidden(['中天', '永钢'], '中天')).toEqual(['永钢'])
  })

  it('偏好解析：脏数据退化为默认值', () => {
    expect(parseBrandPrefs(null)).toEqual({
      order: [],
      hidden: [],
      hiddenLengths: [],
      hiddenFixed: [],
    })
    expect(parseBrandPrefs('not-json')).toEqual({
      order: [],
      hidden: [],
      hiddenLengths: [],
      hiddenFixed: [],
    })
    expect(parseBrandPrefs('{"order":["a",1],"hidden":["b"]}')).toEqual({
      order: ['a'],
      hidden: ['b'],
      hiddenLengths: [],
      hiddenFixed: [],
    })
    // 定尺列隐藏集合同样是个人偏好，随品牌偏好一起存
    expect(
      parseBrandPrefs('{"order":[],"hidden":[],"hiddenLengths":["12米"]}'),
    ).toEqual({
      order: [],
      hidden: [],
      hiddenLengths: ['12米'],
      hiddenFixed: [],
    })
    const prefs = {
      order: ['中天'],
      hidden: ['永钢'],
      hiddenLengths: ['12米'],
      hiddenFixed: ['spec' as const],
    }
    expect(parseBrandPrefs(serializeBrandPrefs(prefs))).toEqual(prefs)
  })
})

describe('列宽：固定表宽，不随容器拉伸', () => {
  it('总宽 = 固定列（序号/规格） + 品牌数 × 定尺数 × 单定尺列宽', () => {
    // 类别是表标题、材质进表头（品牌下的列组），都不占固定列
    const fixed = SHEET_COLUMN_WIDTH.index + SHEET_COLUMN_WIDTH.specNo
    // 9米/12米 拆成两列后，一个品牌的宽度是 2 个定尺列
    expect(sheetWidthOf(1, 2)).toBe(fixed + 2 * SHEET_COLUMN_WIDTH.lengthCell)
    expect(sheetWidthOf(3, 2)).toBe(fixed + 6 * SHEET_COLUMN_WIDTH.lengthCell)
    // 只有一个定尺（整页都是盘螺）时退回单列宽
    expect(sheetWidthOf(2, 1)).toBe(fixed + 2 * SHEET_COLUMN_WIDTH.lengthCell)
  })

  it('隐藏固定列后总宽要扣掉它（否则右侧空一段）', () => {
    const all = sheetWidthOf(1, 1)
    expect(sheetWidthOf(1, 1, ['spec'])).toBe(all - SHEET_COLUMN_WIDTH.specNo)
    expect(sheetWidthOf(1, 1, ['index', 'spec'])).toBe(
      1 * SHEET_COLUMN_WIDTH.lengthCell,
    )
  })

  it('固定列清单是唯一来源：key/文案/宽度都从它派生', () => {
    // 类别不是一个列，而是每张品类表的标题 —— 固定列只剩 序号/规格
    expect(SHEET_FIXED_COLUMNS.map((column) => column.key)).toEqual([
      'index',
      'spec',
    ])
    // 脏数据（未知 key / 非字符串）不会让表格凭空少列
    expect(parseFixedColumnKeys(['spec', 'unknown', 42])).toEqual(['spec'])
    expect(parseFixedColumnKeys('nope')).toEqual([])
  })

  it('没有品牌列时按 1 列计算，表不会塌成 0 宽', () => {
    expect(sheetWidthOf(0, 1)).toBe(sheetWidthOf(1, 1))
    expect(sheetWidthOf(0, 2)).toBe(sheetWidthOf(1, 2))
  })
})

describe('基价模式：整列按「基价 + 加价」重算', () => {
  const rows = groupSpecRows([
    row(12, '9米', 'HRB400'),
    row(14, '9米', 'HRB400'),
    row(16, '9米', 'HRB400'),
  ])
  const base = { material: 'HRB400', spec: 12, length: '9米' }
  const items = [
    { material: 'HRB400', spec: 12, length: '9米', delta: 0 },
    { material: 'HRB400', spec: 14, length: '9米', delta: 50 },
    { material: 'HRB400', spec: 16, length: '9米', delta: 120 },
  ]

  it('返回除基价行外的全部已配置规格价', () => {
    const prices = buildBasePriceColumnPrices({
      base,
      basePrice: 3200,
      items,
      specRows: rows,
    })
    expect(prices.size).toBe(2)
    expect(prices.get('螺纹钢|HRB400|14|9米')).toBe(3250)
    expect(prices.get('螺纹钢|HRB400|16|9米')).toBe(3320)
    // 基价行不返回：它是输入源，不该被算出来的值覆盖
    expect(prices.has('螺纹钢|HRB400|12|9米')).toBe(false)
  })

  it('与「只补空格」的 fillPlan 不同：已有价格的规格也会重算', () => {
    const fillOnly = buildBasePriceFillPlan({
      base,
      basePrice: 3200,
      items,
      specRows: rows,
      isFilled: () => true,
    })
    expect(fillOnly).toHaveLength(0)

    const recomputed = buildBasePriceColumnPrices({
      base,
      basePrice: 3200,
      items,
      specRows: rows,
    })
    expect(recomputed.size).toBe(2)
  })

  it('没有配置加价的规格不产生价格（避免凭空造价）', () => {
    const prices = buildBasePriceColumnPrices({
      base,
      basePrice: 3200,
      items: [{ material: 'HRB400', spec: 14, length: '9米', delta: 50 }],
      specRows: rows,
    })
    expect(prices.has('螺纹钢|HRB400|16|9米')).toBe(false)
  })
})

describe('金额列宽与金额精度', () => {
  it('定尺列宽只按 5 位数留量，标签列仍按 96', () => {
    // 金额去掉 .00 后 5 位数实测 52px 文本 + 内边距 → 76px 正好不裁字；再宽就是浪费可见列数
    expect(SHEET_COLUMN_WIDTH.lengthCell).toBe(76)
    expect(SHEET_COLUMN_WIDTH.labelCell).toBe(96)
    expect(sheetWidthOf(2, 2)).toBe(
      SHEET_COLUMN_WIDTH.index +
        SHEET_COLUMN_WIDTH.specNo +
        2 * 2 * SHEET_COLUMN_WIDTH.lengthCell,
    )
  })

  it('金额四舍五入到分：整数原样，多余小数只留两位', () => {
    expect(roundPrice(3280)).toBe(3280)
    expect(roundPrice(3350.5)).toBe(3350.5)
    expect(roundPrice(3350.555)).toBe(3350.56)
    expect(roundPrice(3350.004)).toBe(3350)
  })
})

describe('行分组：盘螺一组、螺纹按材质分组、组内规格升序', () => {
  const rows = [
    { category: '直条', material: 'HPB300', spec: 32, length: '9米' },
    { category: '直条', material: 'HRB400E', spec: 12, length: '9米' },
    { category: '直条', material: 'HRB400', spec: 12, length: '9米' },
    { category: '盘螺', material: 'HRB400E', spec: 8, length: '' },
    { category: '盘螺', material: 'HRB400', spec: 12, length: '' },
    { category: '盘螺', material: 'HRB400', spec: 6, length: '' },
    { category: '直条', material: 'HRB400', spec: 14, length: '9米' },
  ]

  it('顺序 = 盘螺 → 直条 HRB400 → 直条 HRB400E → 其它材质；组内按规格数值升序', () => {
    const grouped = groupSpecRows(rows)
    expect(
      grouped.map((item) => `${item.category}/${item.material}/${item.spec}`),
    ).toEqual([
      // 盘螺一组，组内先 HRB400 再 HRB400E，规格按数值
      '盘螺/HRB400/6',
      '盘螺/HRB400/12',
      '盘螺/HRB400E/8',
      // 螺纹（直条）按材质分成两组
      '直条/HRB400/12',
      '直条/HRB400/14',
      '直条/HRB400E/12',
      // 其它材质（HPB300）靠后
      '直条/HPB300/32',
    ])
  })

  it('合并跨度：类别整组合并、材质按连续段合并，并在组首标 groupStart', () => {
    const grouped = groupSpecRows(rows)
    const spans = specRowGroupSpans(grouped)
    // 盘螺 3 行：类别只出现一次（rowSpan 3），材质各 1~2 行
    expect(spans.get(specRowKey(grouped[0]))).toEqual({
      categorySpan: 3,
      materialSpan: 2,
      groupStart: true,
    })
    expect(spans.get(specRowKey(grouped[1]))).toEqual({
      categorySpan: 0,
      materialSpan: 0,
      groupStart: false,
    })
    expect(spans.get(specRowKey(grouped[2]))).toEqual({
      categorySpan: 0,
      materialSpan: 1,
      groupStart: false,
    })
    // 直条第一行：新类别第一组，标 groupStart
    expect(spans.get(specRowKey(grouped[3]))?.groupStart).toBe(true)
    expect(spans.get(specRowKey(grouped[3]))?.categorySpan).toBe(4)
  })

  it('过滤后重新计算跨度（避免把不同组强行合并）', () => {
    const grouped = groupSpecRows(rows)
    const filtered = filterSpecRows(grouped, 'HRB400E')
    const spans = specRowGroupSpans(filtered)
    // 过滤后剩「盘螺/HRB400E」与「直条/HRB400E」两行，类别不同 → 各自独立成组
    expect(filtered).toHaveLength(2)
    expect(spans.get(specRowKey(filtered[0]))).toMatchObject({
      categorySpan: 1,
      groupStart: true,
    })
    expect(spans.get(specRowKey(filtered[1]))).toMatchObject({
      categorySpan: 1,
      groupStart: true,
    })
  })
})

describe('基价加价：只填空格子', () => {
  const rows = groupSpecRows([row(10, '9米'), row(12, '9米'), row(14, '9米')])
  const base = { material: 'HRB400E', spec: 10, length: '9米' }
  const items = [
    { material: 'HRB400E', spec: 10, length: '9米', delta: 0 },
    { material: 'HRB400E', spec: 12, length: '9米', delta: 50 },
    { material: 'HRB400E', spec: 14, length: '9米', delta: -20 },
  ]

  it('按 基价 + 加价 算出其它规格，跳过基价本身', () => {
    expect(
      buildBasePriceFillPlan({
        base,
        basePrice: 3200,
        items,
        specRows: rows,
        isFilled: () => false,
      }),
    ).toEqual([
      { rowKey: '螺纹钢|HRB400E|12|9米', value: 3250 },
      { rowKey: '螺纹钢|HRB400E|14|9米', value: 3180 },
    ])
  })

  it('已有价格不覆盖，没有配加价的规格不填', () => {
    const plan = buildBasePriceFillPlan({
      base,
      basePrice: 3200,
      items,
      specRows: rows,
      isFilled: (key) => key === '螺纹钢|HRB400E|12|9米',
    })
    expect(plan.map((cell) => cell.rowKey)).toEqual(['螺纹钢|HRB400E|14|9米'])
  })

  it('基价为空/非正时不填，算出来非正也不填', () => {
    expect(
      buildBasePriceFillPlan({
        base,
        basePrice: 0,
        items,
        specRows: rows,
        isFilled: () => false,
      }),
    ).toEqual([])
    expect(
      buildBasePriceFillPlan({
        base,
        basePrice: 10,
        items: [{ ...items[2], delta: -20 }],
        specRows: rows,
        isFilled: () => false,
      }),
    ).toEqual([])
  })
})
