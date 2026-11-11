// @vitest-environment jsdom

import type { TableColumnsType } from 'antd'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import { usePickupListColumns } from './pickup-list-columns'
import type { PickupListRow } from './pickup-list-draft'

/** 断言用的列视图：只关心 key / 像素宽度 / 是否省略。 */
type AssertableColumn = {
  key?: string | number
  width?: number
  ellipsis?: boolean | { showTitle?: boolean }
}

function findColumn(
  columns: TableColumnsType<PickupListRow> | undefined,
  key: string,
): AssertableColumn | undefined {
  return columns?.find((column) => column.key === key) as unknown as
    | AssertableColumn
    | undefined
}

function buildRow(overrides: Partial<PickupListRow> = {}): PickupListRow {
  const item: PurchaseOrderPickupListItem = {
    itemId: '1',
    orderId: '1',
    orderNo: 'PO-1',
    lineNo: 1,
    warehouseId: 'w1',
    warehouseName: '一号仓',
    brand: '品牌',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9',
    pickupQuantity: 2,
    pieceWeightTon: 0.1,
    pickupWeightTon: 0.2,
  }
  return {
    rowId: item.itemId,
    baseItemId: item.itemId,
    item,
    quantity: item.pickupQuantity,
    weightTon: item.pickupWeightTon,
    partIndex: 0,
    partCount: 1,
    ...overrides,
  }
}

describe('usePickupListColumns', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const renderColumns = () => {
    let columns: ReturnType<typeof usePickupListColumns> | undefined
    function Probe() {
      columns = usePickupListColumns()
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    return () => columns
  }

  it('返回 9 列且包含数量/重量列, 不再有拖拽把手列', () => {
    const getColumns = renderColumns()
    const columns = getColumns()
    expect(columns).toHaveLength(9)
    // 排序改为整行拖动, 不再有独立的拖动列
    expect(columns?.some((column) => column.key === 'drag')).toBe(false)
    const keys = columns?.map((column) => column.key)
    expect(keys).toEqual([
      'warehouseName',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'quantity',
      'pieceWeightTon',
      'weightTon',
    ])
  })

  it('仓库/长度空值渲染为占位符 -', () => {
    const getColumns = renderColumns()
    const columns = getColumns()
    const warehouseColumn = columns?.find(
      (column) => column.key === 'warehouseName',
    ) as { render?: (value: null, row: PickupListRow) => string } | undefined
    const lengthColumn = columns?.find((column) => column.key === 'length') as
      | { render?: (value: null, row: PickupListRow) => string }
      | undefined

    expect(warehouseColumn?.render?.(null, buildRow())).toBe('一号仓')
    expect(
      warehouseColumn?.render?.(
        null,
        buildRow({
          item: {
            ...buildRow().item,
            warehouseName: '  ',
          },
        }),
      ),
    ).toBe('-')
    expect(
      lengthColumn?.render?.(
        null,
        buildRow({ item: { ...buildRow().item, length: null } }),
      ),
    ).toBe('-')
  })

  it('重量列使用拆分后的行值渲染', () => {
    const getColumns = renderColumns()
    const columns = getColumns()
    const weightColumn = columns?.find(
      (column) => column.key === 'weightTon',
    ) as { render?: (value: number) => unknown } | undefined
    expect(weightColumn?.render?.(0.25)).toBe('0.250')
  })

  /*
   * 短值列的契约：不省略 + 宽度不低于实测下限。
   *
   * 下限来源（**实测**）：12px 字号下「表头文字宽」与「内容示例宽」取大者，
   * 再加 24px —— 左右 padding 8+8、边框与列宽拖拽把手的余量。
   *
   * 材质是最容易踩坑的一列：「热轧带肋钢筋」6 个汉字 ×12px = 72，72+24 = 96；
   * 光看「HRB400E」52+24 = 76 会误判成够用，原来 80px 就会把材质截成
   * 「热轧带…」。这些值都是"一眼比对"的短值，截断后读不出含义也比不了大小，
   * 因此宁可让表格横向滚动（`scroll.x` 恒等于列宽合计）。
   *
   * 本次在 Chromium（12px 正文 / 14px 600 表头）上复测取到的文字宽：
   * 「热轧带肋钢筋」72.0、「盘螺调直」48.0、「12米定尺」51.3、「Φ8-10」36.7、
   * 最宽表头「件重（吨）」70.0 —— 与下表下限一致（材质正好卡在 96）。
   */
  const SHORT_VALUE_COLUMNS: ReadonlyArray<readonly [string, number]> = [
    ['brand', 73], // 表头「品牌」与 4 字品牌名取大者
    ['category', 49], // 「类别」
    ['material', 96], // 「热轧带肋钢筋」72 + 24
    ['spec', 58], // 「Φ8-10」34 + 24
    ['length', 74], // 「12米定尺」50 + 24
  ]

  it.each(SHORT_VALUE_COLUMNS)(
    '%s 列不省略（短值），且宽度不低于实测下限 %i',
    (key, minWidth) => {
      const getColumns = renderColumns()
      const column = findColumn(getColumns(), key)
      expect(column?.ellipsis).toBe(false)
      expect(column?.width).toBeGreaterThanOrEqual(minWidth)
    },
  )

  it.each(['quantity', 'pieceWeightTon', 'weightTon'])(
    '%s 数值列不省略，放不下时横向滚动',
    (key) => {
      const getColumns = renderColumns()
      expect(findColumn(getColumns(), key)?.ellipsis).toBe(false)
    },
  )

  it('仓库名称是长文本列，保持省略（全文由 antd 写进 title）', () => {
    const getColumns = renderColumns()
    // 长文本列不设 ellipsis：允许换行显示全名（截断 + hover 反而更难核对）
    expect(findColumn(getColumns(), 'warehouseName')?.ellipsis).not.toBe(true)
  })
})
