import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  gridContentProps: undefined as Record<string, any> | undefined,
  gridOverlayProps: undefined as Record<string, any> | undefined,
  isEditBlockedByStatus: vi.fn(() => false),
  materialImportProps: undefined as Record<string, any> | undefined,
  printDropdownProps: undefined as Record<string, any> | undefined,
  useBusinessGridOverlayPreload: vi.fn(),
  useBusinessGridPage: vi.fn(),
  useBusinessGridRouteSync: vi.fn(),
}))

function createGridState(overrides: Record<string, unknown> = {}) {
  return {
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
    applyFilters: vi.fn(),
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
    ...overrides,
  }
}

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
  isEditBlockedByStatus: mocks.isEditBlockedByStatus,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

vi.mock('@/views/modules/components/BusinessGridContent', () => ({
  BusinessGridContent: (props: Record<string, any>) => {
    mocks.gridContentProps = props
    return (
      <div
        data-testid="grid-content"
        data-can-create={String(props.canCreate)}
        data-loading={String(props.loading)}
      >
        Grid Content
        {props.printDropdown}
      </div>
    )
  },
}))

vi.mock('@/views/modules/components/BusinessGridOverlays', () => ({
  BusinessGridOverlays: (props: Record<string, any>) => {
    mocks.gridOverlayProps = props
    return <div data-testid="grid-overlays">Grid Overlays</div>
  },
}))

vi.mock('@/views/modules/components/MaterialImportActions', () => ({
  MaterialImportActions: (props: Record<string, any>) => {
    mocks.materialImportProps = props
    return <div data-testid="material-import-actions">Material Import</div>
  },
}))

vi.mock('@/views/modules/components/PrintTemplateDropdown', () => ({
  PrintTemplateDropdown: (props: Record<string, any>) => {
    mocks.printDropdownProps = props
    return <div data-testid="print-template-dropdown">Print Dropdown</div>
  },
}))

vi.mock('@/views/modules/use-business-grid-overlay-preload', () => ({
  useBusinessGridOverlayPreload: mocks.useBusinessGridOverlayPreload,
}))

vi.mock('@/views/modules/use-business-grid-page', () => ({
  useBusinessGridPage: mocks.useBusinessGridPage,
}))

vi.mock('@/views/modules/use-business-grid-route-sync', () => ({
  useBusinessGridRouteSync: mocks.useBusinessGridRouteSync,
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

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.gridContentProps = undefined
    mocks.gridOverlayProps = undefined
    mocks.materialImportProps = undefined
    mocks.printDropdownProps = undefined
    mocks.isEditBlockedByStatus.mockReturnValue(false)
    mocks.useBusinessGridPage.mockReturnValue(createGridState())
  })

  it('renders grid content', () => {
    render(<BusinessGridRouteContent {...defaultProps} />)
    expect(screen.getByTestId('grid-content')).toBeTruthy()
    expect(mocks.useBusinessGridPage).toHaveBeenCalledWith({
      moduleKey: 'test-module',
      pageDef: defaultProps.pageDef,
      initialConfig: undefined,
    })
    expect(mocks.useBusinessGridRouteSync).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ readOnly: false }),
        location: expect.objectContaining({ pathname: '/test' }),
      }),
    )
    expect(mocks.useBusinessGridOverlayPreload).toHaveBeenCalledWith({
      canUpdateRecord: true,
      canViewRecords: true,
      config: expect.objectContaining({ readOnly: false }),
    })
  })

  it('renders empty state when module config is missing', () => {
    mocks.useBusinessGridPage.mockReturnValue(createGridState({ config: null }))

    render(<BusinessGridRouteContent {...defaultProps} />)

    expect(screen.getByText('模块配置未找到: test-module')).toBeTruthy()
    expect(screen.queryByTestId('grid-content')).toBeNull()
  })

  it('passes canCreate when module is editable and user can create', () => {
    render(<BusinessGridRouteContent {...defaultProps} />)
    expect(screen.getByTestId('grid-content')).toHaveAttribute(
      'data-can-create',
      'true',
    )
  })

  it('does not pass canCreate for read-only modules', () => {
    mocks.useBusinessGridPage.mockReturnValue(
      createGridState({ config: { readOnly: true } }),
    )

    render(<BusinessGridRouteContent {...defaultProps} />)

    expect(screen.getByTestId('grid-content')).toHaveAttribute(
      'data-can-create',
      'false',
    )
  })

  it('does not pass canCreate for statement modules', () => {
    render(
      <BusinessGridRouteContent
        {...defaultProps}
        pageDef={{ ...defaultProps.pageDef, moduleKey: 'freight-statement' }}
      />,
    )

    expect(screen.getByTestId('grid-content')).toHaveAttribute(
      'data-can-create',
      'false',
    )
  })

  it('forwards toolbar and pagination actions to page state', () => {
    const state = createGridState({ isLoading: false, editorLockLoading: true })
    mocks.useBusinessGridPage.mockReturnValue(state)

    render(<BusinessGridRouteContent {...defaultProps} />)

    const props = mocks.gridContentProps!
    expect(screen.getByTestId('grid-content')).toHaveAttribute(
      'data-loading',
      'true',
    )
    props.onCreate()
    props.onExport()
    props.onRefresh()
    props.onAction({ key: 'audit' })
    props.onPageChange(2, 50)
    props.onPageChange(3, 20)

    expect(state.openEditor).toHaveBeenCalledWith(null)
    expect(state.handleExport).toHaveBeenCalled()
    expect(state.refreshModuleQueries).toHaveBeenCalled()
    expect(state.handleAction).toHaveBeenCalledWith({ key: 'audit' })
    expect(state.setPageSize).toHaveBeenCalledTimes(1)
    expect(state.setPageSize).toHaveBeenCalledWith(50)
    expect(state.setCurrentPage).toHaveBeenCalledWith(2)
    expect(state.setCurrentPage).toHaveBeenCalledWith(3)
  })

  it('toggles row selection state when a row is clicked', () => {
    const state = createGridState()
    mocks.useBusinessGridPage.mockReturnValue(state)
    const record = { id: 'row-1', projectName: '项目甲' }

    render(<BusinessGridRouteContent {...defaultProps} />)

    mocks.gridContentProps!.onRowClick(record)
    const keyUpdater = state.setSelectedRowKeys.mock.calls[0][0]
    const mapUpdater = state.setSelectedRowMap.mock.calls[0][0]

    expect(keyUpdater([])).toEqual(['row-1'])
    expect(keyUpdater(['row-1', 'row-2'])).toEqual(['row-2'])
    expect(mapUpdater({})).toEqual({ 'row-1': record })
    expect(mapUpdater({ 'row-1': record })).toEqual({})
  })

  it('opens editor on row double click when editing is allowed', () => {
    const state = createGridState()
    mocks.useBusinessGridPage.mockReturnValue(state)
    const record = { id: 'row-1', status: '草稿' }

    render(<BusinessGridRouteContent {...defaultProps} />)

    mocks.gridContentProps!.onRowDoubleClick(record)

    expect(state.openEditor).toHaveBeenCalledWith(record)
    expect(state.openDetail).not.toHaveBeenCalled()
    expect(mocks.isEditBlockedByStatus).toHaveBeenCalledWith(
      '草稿',
      'test-module',
    )
  })

  it('opens detail on row double click when the module is read-only', () => {
    const state = createGridState({ config: { readOnly: true } })
    mocks.useBusinessGridPage.mockReturnValue(state)
    const record = { id: 'row-1', status: '草稿' }

    render(<BusinessGridRouteContent {...defaultProps} />)

    mocks.gridContentProps!.onRowDoubleClick(record)

    expect(state.openDetail).toHaveBeenCalledWith(record)
    expect(state.openEditor).not.toHaveBeenCalled()
  })

  it('opens detail on row double click when status blocks editing', () => {
    mocks.isEditBlockedByStatus.mockReturnValue(true)
    const state = createGridState()
    mocks.useBusinessGridPage.mockReturnValue(state)
    const record = { id: 'row-1', status: '已审核' }

    render(<BusinessGridRouteContent {...defaultProps} />)

    mocks.gridContentProps!.onRowDoubleClick(record)

    expect(state.openDetail).toHaveBeenCalledWith(record)
    expect(state.openEditor).not.toHaveBeenCalled()
  })

  it('renders material import and print actions when enabled', () => {
    const state = createGridState({
      canUseBulkPrintActions: true,
      selectedRowKeys: ['1'],
    })
    mocks.useBusinessGridPage.mockReturnValue(state)

    render(
      <BusinessGridRouteContent
        {...defaultProps}
        pageDef={{ ...defaultProps.pageDef, moduleKey: 'material' }}
      />,
    )

    expect(screen.getByTestId('material-import-actions')).toBeTruthy()
    expect(screen.getByTestId('print-template-dropdown')).toBeTruthy()

    mocks.materialImportProps!.onImported()
    mocks.printDropdownProps!.onPrint('preview', { id: 'tpl-1' })

    expect(mocks.materialImportProps).toEqual(
      expect.objectContaining({
        canDownloadTemplate: true,
        canImport: true,
      }),
    )
    expect(mocks.printDropdownProps).toEqual(
      expect.objectContaining({
        disabled: false,
        moduleKey: 'material',
      }),
    )
    expect(state.refreshModuleQueries).toHaveBeenCalled()
    expect(state.handlePrintSelectedRecords).toHaveBeenCalledWith('preview', {
      id: 'tpl-1',
    })
  })

  it('renders grid overlays', () => {
    const state = createGridState({
      editRecord: { id: 'edit-1' },
      editorLineItemsLocked: true,
      lockedLineItemsNotice: '已锁定',
      records: [{ id: '1' }, { id: '2' }],
      selectedRowKeys: ['2'],
    })
    mocks.useBusinessGridPage.mockReturnValue(state)

    render(<BusinessGridRouteContent {...defaultProps} />)

    expect(screen.getByTestId('grid-overlays')).toBeTruthy()
    expect(mocks.gridOverlayProps).toEqual(
      expect.objectContaining({
        canSave: true,
        lineItemsLocked: true,
        lockedLineItemsNotice: '已锁定',
        selectedRows: [{ id: '2' }],
      }),
    )

    mocks.gridOverlayProps!.onSaved()
    mocks.gridOverlayProps!.onGenerateSupplierStatement(
      '供应商甲',
      '2026-01-01',
      '2026-01-31',
    )
    mocks.gridOverlayProps!.onGenerateCustomerStatement(
      '客户甲',
      '2026-02-01',
      '2026-02-28',
    )
    mocks.gridOverlayProps!.onGenerateFreightStatement(
      '物流甲',
      '2026-03-01',
      '2026-03-31',
    )

    expect(state.setSelectedRowKeys).toHaveBeenCalledWith([])
    expect(state.handleEditorSaved).toHaveBeenCalled()
    expect(state.handleStatementGenerate).toHaveBeenCalledWith(
      'supplier',
      '供应商甲',
      '2026-01-01',
      '2026-01-31',
    )
    expect(state.handleStatementGenerate).toHaveBeenCalledWith(
      'customer',
      '客户甲',
      '2026-02-01',
      '2026-02-28',
    )
    expect(state.handleStatementGenerate).toHaveBeenCalledWith(
      'freight',
      '物流甲',
      '2026-03-01',
      '2026-03-31',
    )
  })

  it('exports BusinessGridRouteContent component', () => {
    expect(BusinessGridRouteContent).toBeDefined()
    expect(typeof BusinessGridRouteContent).toBe('function')
  })
})
