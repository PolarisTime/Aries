import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModulePageConfig } from '@/types/module-page'
import { useModuleEditorItemColumns } from '@/views/modules/use-module-editor-item-columns'

const mocks = vi.hoisted(() => ({
  applyMaterialToEditorLineItem: vi.fn(),
  buildModuleEditorDataColumns: vi.fn(),
  buildModuleEditorManagementColumns: vi.fn(),
  fetchMaterialSearch: vi.fn(),
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

vi.mock('@/api/materials', () => ({
  fetchMaterialSearch: mocks.fetchMaterialSearch,
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
          brand: '宝钢',
          category: '卷板',
          material: 'Q235',
          materialCode: 'M-001',
          materialName: '热卷',
          spec: '2.0',
        },
        {
          brand: '重复',
          materialCode: 'm-001',
        },
        {
          brand: '空编码',
          materialCode: ' ',
        },
      ],
      warehouses: [{ label: '一号码头', value: 'W-1' }],
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
            value: 'M-001',
          }),
        ],
        warehouses: [{ label: '一号码头', value: 'W-1' }],
      }),
    )
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

  it('resolves material selection from local and remote material records', async () => {
    mocks.fetchMaterialSearch.mockResolvedValue([
      { materialCode: 'OTHER', materialName: '其他' },
      { materialCode: 'REMOTE-1', materialName: '远程物料' },
    ])
    renderHook(() => useModuleEditorItemColumns(defaultProps()))
    const dataOptions = mocks.buildModuleEditorDataColumns.mock.calls[0][0]

    dataOptions.handleMaterialSelect('line-1', 'M-001')
    expect(mocks.handleMaterialSelect).toHaveBeenLastCalledWith(
      'line-1',
      'M-001',
      expect.objectContaining({ materialCode: 'm-001' }),
      expect.any(Function),
      expect.any(Function),
    )

    dataOptions.handleMaterialSelect('line-1', ' remote-1 ')
    const resolver = mocks.handleMaterialSelect.mock.calls.at(-1)?.[4]
    await expect(resolver(' remote-1 ')).resolves.toEqual(
      expect.objectContaining({ materialCode: 'REMOTE-1' }),
    )
    expect(mocks.fetchMaterialSearch).toHaveBeenCalledWith('remote-1', 20)
    await expect(resolver(' ')).resolves.toBeNull()
  })

  it('limits pinyin initial search for material code select to brand and material name', () => {
    mocks.useMasterOptions.mockReturnValue({
      materials: [
        {
          brand: '中天',
          category: '螺纹钢',
          material: 'HRB400',
          materialCode: 'M-001',
          spec: '18',
        },
        {
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

    expect(matches).toEqual(['M-001'])
    expect(materialOptions.find((option) => option.value === 'M-001')).toEqual(
      expect.objectContaining({
        searchText: expect.stringContaining('zhongtian'),
      }),
    )
    expect(materialOptions.find((option) => option.value === 'M-002')).toEqual(
      expect.objectContaining({
        searchText: expect.not.stringContaining('zhitiao'),
      }),
    )
  })

  it('builds search initials automatically for newly added material brands', () => {
    mocks.useMasterOptions.mockReturnValue({
      materials: [
        {
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
        value: 'M-NEW',
      }),
    ])
    expect(
      materialOptions.filter((option) => option.searchText.includes('cx')),
    ).toEqual([expect.objectContaining({ value: 'M-NEW' })])
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
