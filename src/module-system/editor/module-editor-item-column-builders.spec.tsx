// @vitest-environment jsdom

import type { ColumnsType } from 'antd/es/table'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  buildModuleEditorDataColumns,
  dropEmptyItemColumns,
} from '@/module-system/editor/module-editor-item-column-builders'
import type {
  ModuleColumnDefinition,
  ModuleLineItem,
} from '@/types/module-page'

/**
 * 编辑器明细表对「业务列自定义 render」的契约。
 *
 * <p>背景(真实缺陷): 销售订单新加的「网价匹配」私有列在真机上表头出来了、单元格却只有
 * `-` —— 该列的值不在明细行上(匹配结果是页面级核查快照, 靠列渲染按行 id 订阅),
 * 而编辑器明细表的构造器对每一列都写死 `renderEditableColumn(column)`, 从不读
 * `column.render`。</p>
 *
 * <p>口径(保守): 只有列**显式声明** `renderInEditor` 才在编辑器里使用它的 render, 且只对
 * 只读单元格生效。历史列(派生数量、重量偏差)保持原有只读格式化输出不变, 声明了 editor
 * 或该行可编辑的列仍渲染编辑控件。</p>
 */
describe('编辑器明细列自定义渲染', () => {
  const record = {
    id: 'r1',
    materialCode: 'M-1',
    quantity: 2,
  } as unknown as ModuleLineItem

  const buildColumns = (
    itemColumns: ModuleColumnDefinition[],
    isItemColumnEditable: (key: string, record?: ModuleLineItem) => boolean,
  ) =>
    buildModuleEditorDataColumns({
      config: { key: 'sales-order', statusMap: {} },
      itemColumns,
      materialOptions: [],
      materialSearch: {
        searching: false,
        onSearch: () => {},
        onClose: () => {},
      },
      warehouses: [],
      formatCellValue: (value: unknown) => `formatted:${String(value)}`,
      isItemColumnEditable,
      handleItemInputChange: vi.fn(),
      handleItemNumberChange: vi.fn(),
      handleMaterialSelect: vi.fn(),
      handleSettlementModeChange: vi.fn(),
      handleWarehouseSelect: vi.fn(),
    } as never)

  const renderCell = (
    columns: ColumnsType<ModuleLineItem>,
    dataIndex: string,
    value: unknown,
  ) => {
    const column = columns.find((item) => item.key === dataIndex)
    if (!column) throw new Error(`列 ${dataIndex} 应存在`)
    const render = column.render as
      | ((value: unknown, record: ModuleLineItem) => ReactNode)
      | undefined
    if (!render) throw new Error(`列 ${dataIndex} 应声明 render`)
    return render(value, record)
  }

  it('显式声明 renderInEditor 的只读列走自定义渲染(不再只显示 "-")', () => {
    const customRender = vi.fn(() => '匹配')
    const columns = buildColumns(
      [
        {
          title: '网价匹配',
          dataIndex: 'netPriceMatch',
          render: customRender,
          renderInEditor: true,
        },
      ],
      () => false,
    )

    expect(renderCell(columns, 'netPriceMatch', undefined)).toBe('匹配')
    // 必须把行记录一起传下去: 私有列按行 id 订阅页面级状态, 只给 value 渲染不出来
    expect(customRender).toHaveBeenCalledWith(undefined, record)
  })

  it('未声明 renderInEditor 的列保持原有只读格式化(派生数量列输出不变)', () => {
    const customRender = vi.fn(() => '不该出现')
    const columns = buildColumns(
      [
        {
          title: '已交货数量',
          dataIndex: 'deliveredQuantity',
          type: 'count',
          render: customRender,
        },
      ],
      // 派生列在访问控制里固有只读
      () => false,
    )

    expect(renderCell(columns, 'deliveredQuantity', 1200)).toBe(
      'formatted:1200',
    )
    expect(customRender).not.toHaveBeenCalled()
  })

  it('可编辑行上的列仍渲染编辑控件, 自定义渲染不得抢走编辑能力', () => {
    const customRender = vi.fn(() => '不该出现')
    const columns = buildColumns(
      [
        {
          title: '数量',
          dataIndex: 'quantity',
          type: 'count',
          render: customRender,
          renderInEditor: true,
        },
      ],
      () => true,
    )

    const rendered = renderCell(columns, 'quantity', 2)
    expect(rendered).not.toBe('不该出现')
    expect(customRender).not.toHaveBeenCalled()
  })

  it('没有声明 render 的只读列保持原只读格式化(行为不变)', () => {
    const columns = buildColumns(
      [{ title: '备注', dataIndex: 'remark' }],
      () => false,
    )
    expect(renderCell(columns, 'remark', '加急')).toBe('formatted:加急')
  })
})

/**
 * 「整列都没有信息」的明细列不进表（{@link ModuleColumnDefinition.hideWhenAllEmpty}）。
 *
 * <p>真实缺陷：销售订单的 4 个派生数量列（已交付 / 已退货 / 净交付 / 剩余可出库）由后端按
 * 已保存单据聚合，新建页必然全是空值，于是右侧并排 4 个「-」，白占约三分之一宽度，
 * 还容易让人以为漏填了。修法是"整列没信息就不渲染这一列"，而不是"靠单据状态猜"。</p>
 */
describe('整列无信息的明细列（hideWhenAllEmpty）', () => {
  const column = (
    dataIndex: string,
    extra?: Partial<ModuleColumnDefinition>,
  ): ModuleColumnDefinition => ({ title: dataIndex, dataIndex, ...extra })

  const hideable = (dataIndex: string) =>
    column(dataIndex, { hideWhenAllEmpty: true })

  const keys = (columns: ModuleColumnDefinition[], items: ModuleLineItem[]) =>
    dropEmptyItemColumns(columns, items).map((item) => item.dataIndex)

  it('未声明 hideWhenAllEmpty 的列一律保留（保守默认，不影响其它模块）', () => {
    expect(keys([column('quantity')], [])).toEqual(['quantity'])
  })

  it('整列都是空值 / 0 / 空串时丢弃该列', () => {
    const items = [
      { id: 'r1', deliveredQuantity: undefined },
      { id: 'r2', deliveredQuantity: 0 },
      { id: 'r3', deliveredQuantity: null },
      { id: 'r4', deliveredQuantity: '' },
    ] as unknown as ModuleLineItem[]
    expect(
      keys([column('quantity'), hideable('deliveredQuantity')], items),
    ).toEqual(['quantity'])
  })

  it('任一行有值就保留整列：正数与负数都算有信息（0 与空值不算）', () => {
    const items = [
      { id: 'r1', deliveredQuantity: 0 },
      { id: 'r2', deliveredQuantity: 12 },
    ] as unknown as ModuleLineItem[]
    expect(keys([hideable('deliveredQuantity')], items)).toEqual([
      'deliveredQuantity',
    ])

    const negative = [
      { id: 'r1', deliveredNetQuantity: -3 },
    ] as unknown as ModuleLineItem[]
    expect(keys([hideable('deliveredNetQuantity')], negative)).toEqual([
      'deliveredNetQuantity',
    ])
  })

  it('没有任何明细行时，可隐藏列同样不占表头（新建单据的首帧）', () => {
    expect(
      keys([column('quantity'), hideable('outboundRemainingQuantity')], []),
    ).toEqual(['quantity'])
  })
})
