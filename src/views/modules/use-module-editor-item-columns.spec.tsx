import { describe, expect, it, vi } from 'vitest'

vi.mock('pinyin-pro', () => ({
  pinyin: vi.fn().mockReturnValue([['test']]),
}))

vi.mock('@/api/materials', () => ({
  fetchMaterialSearch: vi.fn(),
}))

vi.mock('@/hooks/useColumnSettingsSupport', () => ({
  useColumnSettingsSupport: vi.fn().mockReturnValue({
    columnOrder: [],
    columnVisibility: {},
    handleColumnOrderChange: vi.fn(),
    handleColumnVisibilityChange: vi.fn(),
  }),
}))

vi.mock('@/hooks/useMasterOptions', () => ({
  useMasterOptions: vi.fn().mockReturnValue({
    warehouses: [],
    materials: [],
  }),
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: vi.fn().mockReturnValue({
    formatCellValue: vi.fn(),
  }),
}))

vi.mock('@/module-system/module-adapter-editor', () => ({
  isEditorItemColumnEditableForModule: vi.fn().mockReturnValue(true),
}))

vi.mock('@/module-system/module-editor-item-column-builders', () => ({
  buildModuleEditorDataColumns: vi.fn().mockReturnValue([]),
  buildModuleEditorManagementColumns: vi.fn().mockReturnValue([]),
}))

vi.mock('@/module-system/module-editor-item-column-handlers', () => ({
  useModuleEditorItemColumnHandlers: vi.fn().mockReturnValue({
    handleItemInputChange: vi.fn(),
    handleItemNumberChange: vi.fn(),
    handleMaterialSelect: vi.fn(),
    handleSettlementModeChange: vi.fn(),
    handleWarehouseSelect: vi.fn(),
  }),
}))

vi.mock('@/module-system/module-editor-line-item-utils', () => ({
  applyMaterialToEditorLineItem: vi.fn(),
}))

describe('useModuleEditorItemColumns', () => {
  it('can be imported', async () => {
    const mod = await import('@/views/modules/use-module-editor-item-columns')
    expect(mod.useModuleEditorItemColumns).toBeDefined()
    expect(typeof mod.useModuleEditorItemColumns).toBe('function')
  })
})
