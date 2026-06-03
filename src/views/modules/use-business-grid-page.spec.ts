import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/hooks/useBusinessGridActions', () => ({
  useBusinessGridActions: vi.fn().mockReturnValue({
    handlePrintSelectedRecords: vi.fn(),
    handleSelectedAuditRecords: vi.fn(),
    handleSelectedDeleteRecords: vi.fn(),
    handleSelectedReverseAuditRecords: vi.fn(),
    markSelectedFreightDelivered: vi.fn(),
    openFreightSummary: vi.fn(),
    handleStatementGenerate: vi.fn(),
  }),
}))

vi.mock('@/hooks/useDefaultPageSize', () => ({
  useDefaultPageSize: vi.fn().mockReturnValue(20),
}))

vi.mock('@/hooks/useDetailSupport', () => ({
  useDetailSupport: vi.fn().mockReturnValue({
    detailOpen: false,
    detailRecord: null,
    detailLoading: false,
    openDetail: vi.fn(),
    closeDetail: vi.fn(),
  }),
}))

vi.mock('@/hooks/useExcelExport', () => ({
  useExcelExport: vi.fn().mockReturnValue({
    exporting: false,
    handleExport: vi.fn(),
  }),
}))

vi.mock('@/hooks/useInfiniteBusinessItems', () => ({
  useInfiniteBusinessItems: vi.fn().mockReturnValue({
    records: [],
    total: 0,
    isLoading: false,
    isFetching: false,
    warningMessage: '',
  }),
}))

vi.mock('@/hooks/useMasterOptions', () => ({
  resolveMasterOptionRequirements: vi.fn().mockReturnValue([]),
  useMasterOptions: vi.fn(),
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: vi.fn().mockReturnValue({
    formatCellValue: vi.fn(),
  }),
}))

vi.mock('@/hooks/useModuleEditorCapabilities', () => ({
  useModuleEditorCapabilities: vi.fn().mockReturnValue({
    canUseBulkAuditActions: false,
    canUseBulkDeleteActions: false,
    canUseBulkPrintActions: false,
    lineItemsLocked: false,
    listAuditTarget: null,
    listReverseAuditTarget: null,
  }),
}))

vi.mock('@/hooks/useModuleFilters', () => ({
  useModuleFilters: vi.fn().mockReturnValue({
    filters: {},
    submittedFilters: {},
    handleSearch: vi.fn(),
    handleReset: vi.fn(),
    updateFilter: vi.fn(),
    setSubmittedFilters: vi.fn(),
  }),
}))

vi.mock('@/hooks/useModulePageConfig', () => ({
  useModulePageConfig: vi.fn().mockReturnValue({
    config: undefined,
  }),
}))

vi.mock('@/hooks/useModulePermissions', () => ({
  useModulePermissions: vi.fn().mockReturnValue({
    canViewRecords: true,
    canCreateRecord: true,
    canUpdateRecord: true,
    canDeleteRecord: false,
    canExportData: true,
    canAuditRecord: false,
    canPrintRecord: false,
    can: vi.fn().mockReturnValue(false),
    resolvedResource: 'test',
  }),
}))

vi.mock('@/hooks/useModuleQueryRefresh', () => ({
  useModuleQueryRefresh: vi.fn().mockReturnValue({
    refreshModuleQueries: vi.fn(),
  }),
}))

vi.mock('@/hooks/useModuleRecordActions', () => ({
  useModuleRecordActions: vi.fn().mockReturnValue({
    buildActions: vi.fn().mockReturnValue([]),
  }),
}))

vi.mock('@/hooks/useModuleRecordHelpers', () => ({
  useModuleRecordHelpers: vi.fn().mockReturnValue({
    getRowClassName: vi.fn().mockReturnValue(''),
  }),
}))

vi.mock('@/hooks/useModuleToolbarActions', () => ({
  useModuleToolbarActions: vi.fn().mockReturnValue({
    visibleToolbarActions: [],
    handleAction: vi.fn(),
  }),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: vi.fn().mockReturnValue(''),
}))

vi.mock('@/module-system/module-adapter-actions', () => ({
  resolveStatusOptions: vi.fn().mockReturnValue([]),
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  getBehaviorValue: vi.fn().mockReturnValue(null),
}))

vi.mock('@/views/modules/use-business-grid-editor', () => ({
  useBusinessGridEditor: vi.fn().mockReturnValue({
    editRecord: null,
    editorLockLoading: false,
    editorLockRelatedRows: [],
    editorOpen: false,
    openEditor: vi.fn(),
    closeEditor: vi.fn(),
    handleSaved: vi.fn(),
  }),
}))

vi.mock('@/views/modules/use-business-grid-overlays', () => ({
  useBusinessGridOverlays: vi.fn().mockReturnValue({
    openAttachment: vi.fn(),
    openCustomerStatement: vi.fn(),
    openSupplierStatement: vi.fn(),
    openFreightStatement: vi.fn(),
    openFreightPickup: vi.fn(),
  }),
}))

vi.mock('@/views/modules/use-business-grid-table', () => ({
  useBusinessGridTable: vi.fn().mockReturnValue({
    columnOrder: [],
    columnVisibleKeys: [],
    antdColumns: [],
    toggleColumn: vi.fn(),
    rowSelection: undefined,
    onColumnOrderChange: vi.fn(),
  }),
}))

describe('useBusinessGridPage', () => {
  it('can be imported', async () => {
    const mod = await import('@/views/modules/use-business-grid-page')
    expect(mod.useBusinessGridPage).toBeDefined()
    expect(typeof mod.useBusinessGridPage).toBe('function')
  })
})
