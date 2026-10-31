import type { TFunction } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SHEET_COLUMN_WIDTH, SHEET_HIDEABLE_COLUMN } from './core'
import {
  buildSheetColumns,
  type ColumnContext,
  FallbackBadge,
} from './sheet-columns'
import {
  EMPTY_PURCHASE_ORDER_TONNAGE,
  SHEET_TON_COLUMN,
  SHEET_TON_COLUMN_ORDER,
  tonColumnKey,
} from './ton-column'
import type { Brand, PriceSheet } from './types'

/** 只回显 key 的 t(): 列头文案不是本用例的断言对象。 */
const fakeT = ((key: string) => key) as unknown as TFunction

function makeSheet(overrides: Partial<PriceSheet> = {}): PriceSheet {
  return {
    id: 'sheet-1',
    name: '批次 1',
    status: '报价',
    projectId: 'project-1',
    projectName: '项目一',
    orderDate: '2026-10-31',
    refDate: '2026-10-31',
    refPeriod: '上午',
    lengthPremium: 30,
    inputs: {},
    rows: [],
    ...overrides,
  }
}

/** 每项宽度取不同值, 断言"列宽来自 ctx.widths"而不是写死。 */
function makeWidths(): Record<keyof typeof SHEET_COLUMN_WIDTH, number> {
  const widths = {} as Record<keyof typeof SHEET_COLUMN_WIDTH, number>
  const keys = Object.keys(
    SHEET_COLUMN_WIDTH,
  ) as (keyof typeof SHEET_COLUMN_WIDTH)[]
  keys.forEach((key, index) => {
    widths[key] = 100 + index
  })
  return widths
}

const brands: Brand[] = [
  { name: '中天', freight: 30 },
  { name: '沙钢', freight: 25 },
]

function makeContext(overrides: Partial<ColumnContext> = {}): ColumnContext {
  return {
    sheet: makeSheet(),
    t: fakeT,
    widths: makeWidths(),
    readOnly: false,
    refDate: '2026-10-31',
    refPeriod: '上午',
    lengthPremium: 30,
    lengthPremiums: {},
    lengthSortOrders: {},
    varietyByLabel: new Map(),
    data: null,
    varieties: [],
    brands,
    rows: [],
    getSpot: () => undefined,
    setSpot: () => {},
    clearSpotSource: () => {},
    getInput: () => undefined,
    setSupplier: () => {},
    fillSupplier: () => {},
    supplierOptions: [],
    patchRow: () => {},
    moveFocus: () => false,
    moveFocusTon: () => false,
    purchaseOrderTonnage: EMPTY_PURCHASE_ORDER_TONNAGE,
    openPurchaseOrderPicker: () => {},
    onReorderBrands: () => {},
    onToggleBrand: () => {},
    supplierFillBrand: undefined,
    setSupplierFillBrand: () => {},
    contextMenuRowId: null,
    onContextMenuRowChange: () => {},
    moveRow: () => {},
    insertRowAt: () => {},
    deleteRow: () => {},
    selectedIds: [],
    toggleSelect: () => {},
    toggleAll: () => {},
    attachSpotRef: false,
    allowHrb400eFallback: false,
    bestOn: false,
    spotResetNonce: 0,
    onInvalidSpot: () => {},
    spotRef: { current: null },
    allowedProducts: [],
    varietyOptionsFlat: [],
    hideRemark: false,
    visibleTonColumnIds: [...SHEET_TON_COLUMN_ORDER],
    hiddenBrands: [],
    visibleBrandCount: brands.length,
    localTonByItemId: new Map(),
    ...overrides,
  }
}

/** 只读断言用形状: 列可以是分组列(children)或普通列。 */
type AnyColumn = {
  dataIndex?: unknown
  width?: number
  key?: unknown
  fixed?: unknown
  children?: AnyColumn[]
}

function columnsOf(overrides: Partial<ColumnContext> = {}): AnyColumn[] {
  return buildSheetColumns(makeContext(overrides)) as unknown as AnyColumn[]
}

describe('比价表格列定义(sheet-columns)', () => {
  it('列顺序与列宽由 ctx 驱动: 选择/拖拽/备注/品类/规格/吨位/品牌组/填充列', () => {
    const ctx = makeContext()
    const columns = columnsOf()

    // 选择列 32 / 拖拽手柄 24, 都固定在左侧
    expect(columns[0]).toMatchObject({ width: 32, fixed: 'left' })
    expect(columns[1]).toMatchObject({ width: 24, fixed: 'left' })
    // 备注列宽度来自宽度表
    expect(columns[2]).toMatchObject({
      dataIndex: 'remark',
      width: ctx.widths.remark,
    })
    expect(columns[3]).toMatchObject({
      dataIndex: 'category',
      width: ctx.widths.category,
    })
    expect(columns[4]).toMatchObject({
      dataIndex: 'base',
      width: ctx.widths.spec,
    })
    // 报单吨位列(基础列)
    expect(columns[5]).toMatchObject({ width: ctx.widths.ton })
    // 两个可显隐吨位列, 顺序与宽度都来自唯一注册表
    expect(columns[6].width).toBe(
      ctx.widths[SHEET_TON_COLUMN.remaining.widthKey],
    )
    expect(columns[7].width).toBe(ctx.widths[SHEET_TON_COLUMN.shipped.widthKey])
    // 品牌组: 每个品牌一组 4 个子列(网价/现货/差价/简称), 宽度同样取宽度表
    const brandGroups = columns.filter((column) => column.children)
    expect(brandGroups).toHaveLength(brands.length)
    expect(brandGroups[0].children?.map((column) => column.width)).toEqual([
      ctx.widths.net,
      ctx.widths.spot,
      ctx.widths.diff,
      ctx.widths.supplier,
    ])
    // 填充列有意保留, 且恒在最后
    expect(columns.at(-1)).toMatchObject({ key: '__filler__' })
  })

  it('隐藏备注列只移除备注列, 其余列顺序不变', () => {
    const shown = columnsOf({ hideRemark: false })
    const hidden = columnsOf({ hideRemark: true })

    expect(hidden).toHaveLength(shown.length - 1)
    expect(hidden.some((column) => column.dataIndex === 'remark')).toBe(false)
    // 去掉备注列后, 品类/规格列前移一位, 相对顺序不变
    expect(hidden[2]).toMatchObject({ dataIndex: 'category' })
    expect(hidden[3]).toMatchObject({ dataIndex: 'base' })
  })

  it('吨位列显隐由 visibleTonColumnIds 驱动(唯一注册表)', () => {
    const all = columnsOf()
    const remainingWidth = all[6].width
    const shippedWidth = all[7].width
    expect(remainingWidth).toBe(
      makeContext().widths[SHEET_TON_COLUMN.remaining.widthKey],
    )
    expect(shippedWidth).toBe(
      makeContext().widths[SHEET_TON_COLUMN.shipped.widthKey],
    )

    const none = columnsOf({ visibleTonColumnIds: [] })
    expect(none).toHaveLength(all.length - 2)
    expect(none.some((column) => column.width === remainingWidth)).toBe(false)
    expect(none.some((column) => column.width === shippedWidth)).toBe(false)
    // 仍保留基础报单吨位列
    expect(none[5]).toMatchObject({ width: makeContext().widths.ton })

    const onlyShipped = columnsOf({ visibleTonColumnIds: ['shipped'] })
    expect(onlyShipped.some((column) => column.width === remainingWidth)).toBe(
      false,
    )
    expect(onlyShipped.some((column) => column.width === shippedWidth)).toBe(
      true,
    )
    expect(onlyShipped[6]).toMatchObject({ width: shippedWidth })
  })

  it('隐藏品牌不再生成该品牌列组, 可见品牌保持原顺序', () => {
    const withHidden = columnsOf({ hiddenBrands: ['沙钢'] })
    const brandGroups = withHidden.filter((column) => column.children)
    expect(brandGroups).toHaveLength(brands.length - 1)

    const visibleOnly = columnsOf({ hiddenBrands: [] }).filter(
      (column) => column.children,
    )
    expect(visibleOnly).toHaveLength(brands.length)
  })

  it('可显隐列的 key 与偏好登记表同源', () => {
    // 备注列 key 使用 SHEET_HIDEABLE_COLUMN.remark（列设置弹层读写同一 key）
    const columns = columnsOf()
    const remark = columns.find((column) => column.dataIndex === 'remark')
    expect(remark).toBeDefined()
    expect(SHEET_HIDEABLE_COLUMN.remark).toBe('remark')
    expect(tonColumnKey('remaining')).toBe(SHEET_HIDEABLE_COLUMN.unopenedTon)
    expect(tonColumnKey('shipped')).toBe(SHEET_HIDEABLE_COLUMN.issuedTon)
  })
})

describe('FallbackBadge(列内角标唯一出口)', () => {
  it('带 label: role=img + aria-label + title, 读屏可区分来源', () => {
    const html = renderToStaticMarkup(<FallbackBadge label="按 HRB400E 代取" />)
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="按 HRB400E 代取"')
    expect(html).toContain('title="按 HRB400E 代取"')
    expect(html).toContain('>E</span>')
  })

  it('不带 label(表头图例): 装饰性 chip, aria-hidden', () => {
    const html = renderToStaticMarkup(<FallbackBadge />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role="img"')
  })
})
