import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModulePageConfig } from '@/types/module-page'
import { useModuleEditorItemColumns } from '@/views/modules/use-module-editor-item-columns'

const mocks = vi.hoisted(() => ({
  applyMaterialToEditorLineItem: vi.fn(),
  buildModuleEditorDataColumns: vi.fn(),
  buildModuleEditorManagementColumns: vi.fn(),
  formatCellValue: vi.fn(),
  handleColumnOrderChange: vi.fn(),
  handleColumnVisibilityChange: vi.fn(),
  handleItemInputChange: vi.fn(),
  handleItemNumberChange: vi.fn(),
  handleMaterialSelect: vi.fn(),
  handleSettlementModeChange: vi.fn(),
  handleWarehouseSelect: vi.fn(),
  isEditorItemColumnEditableForModule: vi.fn(),
  pinyin: vi.fn(),
  useColumnSettingsSupport: vi.fn(),
  useMasterOptions: vi.fn(),
}))

vi.mock('pinyin-pro', () => ({
  pinyin: mocks.pinyin,
}))

vi.mock('@/hooks/useColumnSettingsSupport', () => ({
  useColumnSettingsSupport: mocks.useColumnSettingsSupport,
}))

vi.mock('@/hooks/useMasterOptions', () => ({
  useMasterOptions: mocks.useMasterOptions,
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: vi.fn().mockReturnValue({
    formatCellValue: mocks.formatCellValue,
  }),
}))

vi.mock('@/module-system/module-adapter-editor', () => ({
  isEditorItemColumnEditableForModule:
    mocks.isEditorItemColumnEditableForModule,
}))

vi.mock('@/module-system/module-editor-item-column-builders', () => ({
  buildModuleEditorDataColumns: mocks.buildModuleEditorDataColumns,
  buildModuleEditorManagementColumns: mocks.buildModuleEditorManagementColumns,
}))

vi.mock('@/module-system/module-editor-item-column-handlers', () => ({
  useModuleEditorItemColumnHandlers: vi.fn().mockReturnValue({
    handleItemInputChange: mocks.handleItemInputChange,
    handleItemNumberChange: mocks.handleItemNumberChange,
    handleMaterialSelect: mocks.handleMaterialSelect,
    handleSettlementModeChange: mocks.handleSettlementModeChange,
    handleWarehouseSelect: mocks.handleWarehouseSelect,
  }),
}))

vi.mock('@/module-system/module-editor-line-item-utils', () => ({
  applyMaterialToEditorLineItem: mocks.applyMaterialToEditorLineItem,
}))

describe('useModuleEditorItemColumns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pinyin.mockImplementation((value: string) => {
      const tokens: Record<string, string> = {
        中: 'zhong',
        天: 'tian',
        直: 'zhi',
        条: 'tiao',
        铸: 'zhu',
        铁: 'tie',
        长: 'chang',
        兴: 'xing',
      }
      return value
        .split('')
        .filter(Boolean)
        .map((char) => tokens[char] || char.toLowerCase())
    })
    mocks.useMasterOptions.mockReturnValue({
      materials: [
        {
          id: '308251467645452280',
          brand: '宝钢',
          category: '卷板',
          material: 'Q235',
          materialCode: 'M-001',
          materialName: '热卷',
          spec: '2.0',
        },
        {
          id: '308251467645452280',
          brand: '重复',
          materialCode: 'm-001',
        },
        {
          id: '308251467645452282',
          brand: '空编码',
          materialCode: ' ',
        },
      ],
      warehouses: [
        {
          id: '308251467645452283',
          label: '一号码头',
          value: '308251467645452283',
          warehouseCode: 'WH-1',
          warehouseName: '一号码头',
        },
      ],
    })
    mocks.useColumnSettingsSupport.mockReturnValue({
      columnOrder: ['warehouseName', 'missing'],
      columnVisibility: { quantity: false },
      handleColumnOrderChange: mocks.handleColumnOrderChange,
      handleColumnVisibilityChange: mocks.handleColumnVisibilityChange,
    })
    mocks.isEditorItemColumnEditableForModule.mockReturnValue(true)
    mocks.buildModuleEditorManagementColumns.mockReturnValue([
      { key: 'selection' },
      { key: '_index' },
    ])
    mocks.buildModuleEditorDataColumns.mockReturnValue([{ key: 'data' }])
  })

  it('builds ordered visible item columns and management columns', () => {
    const { result } = renderHook(() =>
      useModuleEditorItemColumns({
        ...defaultProps(),
        canManageItems: true,
      }),
    )

    expect(result.current.itemColumnOrder).toEqual([
      'warehouseName',
      'materialCode',
      'quantity',
    ])
    expect(result.current.visibleItemColumnKeys).toEqual([
      'warehouseName',
      'materialCode',
    ])
    expect(result.current.itemColumns).toHaveLength(3)
    expect(mocks.buildModuleEditorManagementColumns).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ id: 'line-1' }],
        selectedItemIds: ['line-1'],
      }),
    )
    expect(mocks.buildModuleEditorDataColumns).toHaveBeenCalledWith(
      expect.objectContaining({
        itemColumns: [
          expect.objectContaining({ dataIndex: 'warehouseName' }),
          expect.objectContaining({ dataIndex: 'materialCode' }),
        ],
        materialOptions: [
          expect.objectContaining({
            label: '宝钢 | 卷板 | Q235 | 2.0',
            value: '308251467645452280',
          }),
        ],
        warehouses: [
          expect.objectContaining({
            value: '308251467645452283',
            warehouseName: '一号码头',
          }),
        ],
      }),
    )
  })

  it('builds material options and resolves selections strictly by material id', () => {
    const material = {
      id: '308251467645452289',
      brand: '宝钢',
      materialCode: 'M-001',
      material: 'Q235',
    }
    mocks.useMasterOptions.mockReturnValue({
      materials: [material],
      warehouses: [],
    })

    renderHook(() => useModuleEditorItemColumns(defaultProps()))
    const dataOptions = mocks.buildModuleEditorDataColumns.mock.calls[0][0]

    expect(dataOptions.materialOptions).toEqual([
      expect.objectContaining({
        value: '308251467645452289',
        label: '宝钢 | Q235',
      }),
    ])

    dataOptions.handleMaterialSelect('line-1', '308251467645452289')
    expect(mocks.handleMaterialSelect).toHaveBeenLastCalledWith(
      'line-1',
      '308251467645452289',
      material,
      expect.any(Function),
    )
    const applySelectedMaterial =
      mocks.handleMaterialSelect.mock.calls.at(-1)?.[3]
    applySelectedMaterial(
      { id: 'line-1', quantity: 1 },
      { id: '308251467645452289', materialCode: 'M-001' },
    )
    expect(mocks.applyMaterialToEditorLineItem).toHaveBeenCalledWith(
      { id: 'line-1', quantity: 1 },
      { id: '308251467645452289', materialCode: 'M-001' },
      'purchase-inbound',
    )
  })

  it('does not merge distinct material ids through a duplicate material code', () => {
    mocks.useMasterOptions.mockReturnValue({
      materials: [
        {
          id: '308251467645452290',
          brand: '品牌A',
          materialCode: 'M-SAME',
        },
        {
          id: '308251467645452291',
          brand: '品牌B',
          materialCode: 'M-SAME',
        },
      ],
      warehouses: [],
    })

    renderHook(() => useModuleEditorItemColumns(defaultProps()))
    const dataOptions = mocks.buildModuleEditorDataColumns.mock.calls[0][0]

    expect(
      dataOptions.materialOptions.map(
        (option: { value: string }) => option.value,
      ),
    ).toEqual(['308251467645452290', '308251467645452291'])
  })

  it('passes row record when checking item column editability', () => {
    renderHook(() => useModuleEditorItemColumns(defaultProps()))
    const dataOptions = mocks.buildModuleEditorDataColumns.mock.calls[0][0]

    dataOptions.isItemColumnEditable('materialCode', {
      id: 'line-1',
      sourcePurchaseOrderItemId: 'po-item-1',
    })

    expect(mocks.isEditorItemColumnEditableForModule).toHaveBeenCalledWith(
      'purchase-inbound',
      'materialCode',
      true,
      false,
      expect.objectContaining({
        id: 'line-1',
        sourcePurchaseOrderItemId: 'po-item-1',
      }),
      false,
    )
  })

  it('passes parent imported lock when checking item column editability', () => {
    renderHook(() =>
      useModuleEditorItemColumns({
        ...defaultProps(),
        parentImportedItemEditLocked: true,
      }),
    )
    const dataOptions = mocks.buildModuleEditorDataColumns.mock.calls[0][0]

    dataOptions.isItemColumnEditable('unitPrice', { id: 'line-1' })

    expect(mocks.isEditorItemColumnEditableForModule).toHaveBeenCalledWith(
      'purchase-inbound',
      'unitPrice',
      true,
      false,
      expect.objectContaining({ id: 'line-1' }),
      true,
    )
  })

  it('toggles item column visibility and exposes column order handler', () => {
    const { result } = renderHook(() =>
      useModuleEditorItemColumns(defaultProps()),
    )

    act(() => result.current.toggleItemColumn('quantity'))
    expect(mocks.handleColumnVisibilityChange).toHaveBeenCalledWith({})

    act(() => result.current.toggleItemColumn('materialCode'))
    expect(mocks.handleColumnVisibilityChange).toHaveBeenCalledWith({
      materialCode: false,
      quantity: false,
    })

    result.current.onItemColumnOrderChange(['quantity', 'materialCode'])
    expect(mocks.handleColumnOrderChange).toHaveBeenCalledWith([
      'quantity',
      'materialCode',
    ])
  })

  it('uses module key fallback and returns no columns when item columns are absent', () => {
    const configWithoutItemColumns = {
      ...config(),
      key: undefined as unknown as string,
      itemColumns: undefined,
    } as ModulePageConfig

    const { result } = renderHook(() =>
      useModuleEditorItemColumns({
        ...defaultProps(),
        config: configWithoutItemColumns,
        moduleKey: 'fallback-module',
      }),
    )

    expect(mocks.useColumnSettingsSupport).toHaveBeenCalledWith(
      'fallback-module:editor-items',
      undefined,
      0,
    )
    expect(result.current.itemColumnOrder).toEqual([])
    expect(result.current.visibleItemColumnKeys).toEqual([])
    expect(result.current.itemColumns).toEqual([])
    expect(mocks.buildModuleEditorManagementColumns).not.toHaveBeenCalled()
    expect(mocks.buildModuleEditorDataColumns).not.toHaveBeenCalled()
  })

  it('builds material options from material name when optional fields are absent', () => {
    mocks.useMasterOptions.mockReturnValue({
      materials: [
        {
          brand: '无编码',
        },
        {
          id: '308251467645452292',
          materialCode: 'NAME-1',
          materialName: '命名物料',
        },
      ],
      warehouses: [],
    })

    renderHook(() => useModuleEditorItemColumns(defaultProps()))
    const dataOptions = mocks.buildModuleEditorDataColumns.mock.calls[0][0]
    const materialOptions = dataOptions.materialOptions as Array<{
      label: string
      searchText: string
      value: string
    }>

    expect(materialOptions).toEqual([
      expect.objectContaining({
        label: '命名物料',
        searchText: expect.stringContaining('name-1 命名物料'),
        value: '308251467645452292',
      }),
    ])
  })

  it('excludes category from material code select search text', () => {
    mocks.useMasterOptions.mockReturnValue({
      materials: [
        {
          id: '308251467645452293',
          brand: '中天',
          category: '螺纹钢',
          material: 'HRB400',
          materialCode: 'M-001',
          spec: '18',
        },
        {
          id: '308251467645452294',
          brand: '宝钢',
          category: '直条',
          material: '铸铁',
          materialCode: 'M-002',
          spec: '20',
        },
      ],
      warehouses: [],
    })

    renderHook(() => useModuleEditorItemColumns(defaultProps()))
    const dataOptions = mocks.buildModuleEditorDataColumns.mock.calls[0][0]
    const materialOptions = dataOptions.materialOptions as Array<{
      searchText: string
      value: string
    }>
    const matches = materialOptions
      .filter((option) => option.searchText.includes('zt'))
      .map((option) => option.value)

    expect(matches).toEqual(['308251467645452293'])
    expect(
      materialOptions.find((option) => option.value === '308251467645452293'),
    ).toEqual(
      expect.objectContaining({
        searchText: expect.stringContaining('zhongtian'),
      }),
    )
    const categoryOnlyOption = materialOptions.find(
      (option) => option.value === '308251467645452294',
    )
    expect(categoryOnlyOption?.searchText).not.toContain('直条')
    expect(categoryOnlyOption?.searchText).not.toContain('zhitiao')
  })

  it('builds search initials automatically for newly added material brands', () => {
    mocks.useMasterOptions.mockReturnValue({
      materials: [
        {
          id: '308251467645452295',
          brand: '长兴',
          category: '螺纹钢',
          material: 'HRB400',
          materialCode: 'M-NEW',
          spec: '12',
        },
      ],
      warehouses: [],
    })

    renderHook(() => useModuleEditorItemColumns(defaultProps()))
    const dataOptions = mocks.buildModuleEditorDataColumns.mock.calls[0][0]
    const materialOptions = dataOptions.materialOptions as Array<{
      searchText: string
      value: string
    }>

    expect(materialOptions).toEqual([
      expect.objectContaining({
        searchText: expect.stringContaining('changxing'),
        value: '308251467645452295',
      }),
    ])
    expect(
      materialOptions.filter((option) => option.searchText.includes('cx')),
    ).toEqual([expect.objectContaining({ value: '308251467645452295' })])
  })

  it('omits management columns when line items cannot be managed', () => {
    const { result } = renderHook(() =>
      useModuleEditorItemColumns({
        ...defaultProps(),
        canManageItems: false,
      }),
    )

    expect(result.current.itemColumns).toHaveLength(1)
    expect(mocks.buildModuleEditorManagementColumns).not.toHaveBeenCalled()
  })
})

function defaultProps() {
  return {
    moduleKey: 'purchase-inbound',
    config: config(),
    items: [{ id: 'line-1' }],
    setItems: vi.fn(),
    canManageItems: true,
    lineItemsLocked: false,
    canEditItemColumns: true,
    parentImportedItemEditLocked: false,
    selectedItemIds: ['line-1'],
    onSelectAll: vi.fn(),
    onSelectItem: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDragEnd: vi.fn(),
  }
}

function config(): ModulePageConfig {
  return {
    key: 'purchase-inbound',
    title: '采购入库',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    itemColumns: [
      { dataIndex: 'materialCode', title: '物料编码' },
      { dataIndex: 'warehouseName', title: '仓库' },
      { dataIndex: 'quantity', title: '数量' },
    ],
    data: [],
    buildOverview: () => [],
  }
}
