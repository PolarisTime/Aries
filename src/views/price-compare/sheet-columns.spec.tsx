import type { TFunction } from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SHEET_COLUMN_WIDTH, SHEET_HIDEABLE_COLUMN } from './core'
import {
  buildSheetColumns,
  type ColumnContext,
  FallbackBadge,
} from './sheet-columns'
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
    hiddenBrands: [],
    visibleBrandCount: brands.length,
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
  it('列顺序与列宽由 ctx 驱动: 选择/拖拽/备注/品类/规格/报单吨位/品牌组/填充列', () => {
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
    // 报单吨位列(唯一的吨位列, 已开/未开两列随采购解耦移除)
    expect(columns[5]).toMatchObject({ width: ctx.widths.ton })
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

  it('吨位列只有一列: 不再有已开/未开两列', () => {
    const columns = columnsOf()
    const tonWidth = makeContext().widths.ton
    expect(columns.filter((column) => column.width === tonWidth)).toHaveLength(
      1,
    )
    // 6 个前置列 + 品牌组 + 填充列
    expect(columns).toHaveLength(6 + brands.length + 1)
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
    // 已开/未开两列的 key 随采购解耦一并移除, 偏好登记表只保留备注与品牌
    expect(SHEET_HIDEABLE_COLUMN).not.toHaveProperty('issuedTon')
    expect(SHEET_HIDEABLE_COLUMN).not.toHaveProperty('unopenedTon')
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
