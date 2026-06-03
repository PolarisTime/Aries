import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({
    pathname: '/test',
    search: '',
    hash: '',
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'modules.page.moduleConfigNotFound': '模块配置未找到',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  isEditBlockedByStatus: () => false,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

vi.mock('@/views/modules/components/BusinessGridContent', () => ({
  BusinessGridContent: () => (
    <div data-testid="grid-content">Grid Content</div>
  ),
}))

vi.mock('@/views/modules/components/BusinessGridOverlays', () => ({
  BusinessGridOverlays: () => (
    <div data-testid="grid-overlays">Grid Overlays</div>
  ),
}))

vi.mock('@/views/modules/components/MaterialImportActions', () => ({
  MaterialImportActions: () => null,
}))

vi.mock('@/views/modules/components/PrintTemplateDropdown', () => ({
  PrintTemplateDropdown: () => null,
}))

vi.mock('@/views/modules/use-business-grid-page', () => ({
  useBusinessGridPage: () => ({
    config: { readOnly: false },
    records: [],
    isLoading: false,
    editorLockLoading: false,
    exporting: false,
    total: 0,
    currentPage: 1,
    pageSize: 20,
    warningMessage: null,
    columnVisibleKeys: [],
    columnOrder: [],
    antdColumns: [],
    rowSelection: {},
    getRowClassName: () => '',
    updateFilter: vi.fn(),
    handleSearch: vi.fn(),
    handleReset: vi.fn(),
    openEditor: vi.fn(),
    handleExport: vi.fn(),
    refreshModuleQueries: vi.fn(),
    toggleColumn: vi.fn(),
    onColumnOrderChange: vi.fn(),
    setSelectedRowKeys: vi.fn(),
    setSelectedRowMap: vi.fn(),
    openDetail: vi.fn(),
    canViewRecords: true,
    canUpdateRecord: true,
    canCreateRecord: true,
    canExportData: true,
    visibleToolbarActions: [],
    handleAction: vi.fn(),
    setPageSize: vi.fn(),
    setCurrentPage: vi.fn(),
    selectedRowKeys: [],
    canUseBulkPrintActions: false,
    handlePrintSelectedRecords: vi.fn(),
    clearSelection: vi.fn(),
    setSubmittedFilters: vi.fn(),
    editRecord: null,
    editorOpen: false,
    detailOpen: false,
    detailRecord: null,
    detailLoading: false,
    overlays: {
      attachOpen: false,
      attachRecordId: null,
      supplierStatementOpen: false,
      customerStatementOpen: false,
      freightStatementOpen: false,
      freightPickupOpen: false,
      freightPickupRecords: [],
      closeAttachment: vi.fn(),
      closeSupplierStatement: vi.fn(),
      closeCustomerStatement: vi.fn(),
      closeFreightStatement: vi.fn(),
      closeFreightPickup: vi.fn(),
    },
    editorLineItemsLocked: false,
    lockedLineItemsNotice: '',
    closeEditor: vi.fn(),
    handleEditorSaved: vi.fn(),
    closeDetail: vi.fn(),
    handleStatementGenerate: vi.fn(),
    filters: [],
    setFilters: vi.fn(),
    submittedFilters: [],
  }),
}))

vi.mock('@/views/modules/use-business-grid-route-sync', () => ({
  useBusinessGridRouteSync: vi.fn(),
}))

import { BusinessGridRouteContent } from '@/views/modules/BusinessGridRouteContent'

describe('BusinessGridRouteContent', () => {
  const defaultProps = {
    pageDef: {
      key: 'test-page',
      moduleKey: 'test-module',
      title: '测试页面',
      resourceKey: 'test-resource',
    },
    initialConfig: undefined,
  }

  it('renders grid content', () => {
    render(<BusinessGridRouteContent {...defaultProps} />)
    expect(screen.getByTestId('grid-content')).toBeTruthy()
  })

  it('renders grid overlays', () => {
    render(<BusinessGridRouteContent {...defaultProps} />)
    expect(screen.getByTestId('grid-overlays')).toBeTruthy()
  })

  it('exports BusinessGridRouteContent component', () => {
    expect(BusinessGridRouteContent).toBeDefined()
    expect(typeof BusinessGridRouteContent).toBe('function')
  })
})
