import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('dayjs', () => {
  const dayjs = (_v?: unknown) => ({
    isValid: () => true,
    format: () => '',
    valueOf: () => 0,
  })
  dayjs.isDayjs = () => false
  return { default: dayjs }
})

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/api/business', () => ({
  allocateBusinessPrimaryNo: vi.fn().mockResolvedValue({ generatedNo: 'PRE-001', generatedId: 'pre-id-1' }),
  generateBusinessPrimaryNo: vi.fn().mockResolvedValue('GEN-001'),
  getBusinessModuleDetail: vi.fn().mockResolvedValue({ data: { id: '1', items: [] } }),
  listAllBusinessModuleRows: vi.fn().mockResolvedValue([]),
  saveBusinessModule: vi.fn().mockResolvedValue({ data: { id: 'saved-1', orderNo: 'ORD-001' } }),
}))

vi.mock('@/api/system-settings', () => ({
  DISPLAY_SWITCH_CODES: { useSnowflakeBusinessNo: 'code' },
  isDisplaySwitchEnabled: vi.fn().mockReturnValue(false),
  listClientSettings: vi.fn().mockResolvedValue([]),
  listSystemSettings: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { generalSetting: ['general'], clientSettings: ['client'] },
}))

vi.mock('@/hooks/useModuleQueryRefresh', () => ({
  useModuleQueryRefresh: vi.fn().mockReturnValue({
    refreshModuleQueries: vi.fn(),
  }),
}))

vi.mock('@/module-system/module-adapter-editor', () => ({
  applyFormFieldDefaultDraftValues: vi.fn(),
  applyModuleDefaultEditorDraft: vi.fn(),
  buildDefaultEditorLineItem: vi.fn().mockReturnValue({ id: 'new-item' }),
  getEditorValidationMessage: vi.fn().mockReturnValue(null),
  normalizeDraftRecordForModule: vi.fn(),
  syncDerivedEditorFormValuesForModule: vi.fn().mockReturnValue({}),
  trimEditorItemsForModule: vi.fn().mockReturnValue([]),
}))

vi.mock('@/module-system/module-adapter-parent-import', () => ({
  buildOccupiedParentMap: vi.fn().mockReturnValue({}),
  buildParentImportState: vi.fn().mockReturnValue({
    parentNosText: '',
    shouldApplyMappedValues: false,
    mappedValues: {},
    nextItems: [],
    hasImportedCurrentParent: false,
    importedItemCount: 0,
  }),
}))

vi.mock('@/module-system/module-adapter-shared', () => ({
  getModuleRecordPrimaryNo: vi.fn().mockReturnValue(''),
  parseParentRelationNos: vi.fn().mockReturnValue([]),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/clone-utils', () => ({
  cloneLineItems: vi.fn().mockReturnValue([]),
}))

vi.mock('@/utils/formatters', () => ({
  parseDateTimeValue: vi.fn(),
}))

vi.mock('@/utils/storage', () => ({
  getStoredUser: vi.fn().mockReturnValue(null),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: vi.fn((v: unknown) => String(v ?? '')),
}))

vi.mock('@/views/system/general-settings-view-utils', () => ({
  resolveDefaultTaxRateValue: vi.fn().mockReturnValue(0),
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: vi.fn().mockReturnValue({
    formatCellValue: vi.fn((v: unknown) => String(v ?? '')),
  }),
}))

function cfg(overrides: Record<string, unknown> = {}) {
  return {
    key: 'test-module', title: 'Test', kicker: '', description: '',
    filters: [], columns: [], detailFields: [], data: [],
    buildOverview: () => [], formFields: [], itemColumns: [],
    primaryNoKey: 'orderNo', ...overrides,
  }
}

function frm() {
  return {
    validateFields: vi.fn().mockResolvedValue({ id: 'fv', orderNo: 'ORD-001' }),
    getFieldsValue: vi.fn().mockReturnValue({ id: 'fv', orderNo: 'ORD-001' }),
    setFieldsValue: vi.fn(),
    resetFields: vi.fn(),
  }
}

function props(overrides: Record<string, unknown> = {}) {
  return {
    open: true, config: cfg(), record: null, moduleKey: 'test-module',
    editorAuditTarget: null, form: frm(), onClose: vi.fn(), onSaved: vi.fn(),
    autoInsertBlankItemOnCreate: false, ...overrides,
  }
}

describe('useModuleEditorWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('can be imported', async () => {
    const mod = await import('@/views/modules/use-module-editor-workspace')
    expect(mod.useModuleEditorWorkspace).toBeDefined()
  })

  it('returns expected properties when open is false', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    expect(result.current.saving).toBe(false)
    expect(result.current.parentSelectorOpen).toBe(false)
    expect(result.current.parentImporting).toBe(false)
    expect(result.current.primaryNoLoading).toBe(false)
    expect(result.current.saveResult).toBeNull()
    expect(result.current.isEdit).toBe(false)
    expect(result.current.items).toEqual([])
  })

  it('has all expected return properties', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    const keys = [
      'addItem', 'closeParentSelector', 'handleImportParentRecord', 'handleSave',
      'isEdit', 'items', 'openParentSelector', 'parentImporting', 'parentSelectorFilters',
      'parentSelectorOpen', 'primaryNoLoading', 'saveResult', 'clearSaveResult',
      'saving', 'setItems', 'handleFormValuesChange',
    ]
    for (const k of keys) expect(result.current).toHaveProperty(k)
  })

  it('starts with empty items in create mode without autoInsert', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    expect(result.current.items).toEqual([])
    expect(result.current.isEdit).toBe(false)
  })

  it('clearSaveResult resets save result', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    act(() => { result.current.clearSaveResult() })
    expect(result.current.saveResult).toBeNull()
  })

  it('handleFormValuesChange is callable when not open', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    act(() => { result.current.handleFormValuesChange({ orderNo: 'X' }) })
  })

  it('openParentSelector is no-op without parentImport config', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    act(() => { result.current.openParentSelector() })
    expect(result.current.parentSelectorOpen).toBe(false)
  })

  it('closeParentSelector resets session', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    act(() => { result.current.closeParentSelector() })
    expect(result.current.parentSelectorOpen).toBe(false)
  })

  it('setItems with array works', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    act(() => { result.current.setItems([{ id: 'a' }]) })
    expect(result.current.items).toEqual([{ id: 'a' }])
  })

  it('setItems with function updater works', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    act(() => { result.current.setItems([]) })
    act(() => { result.current.setItems((prev: any[]) => [...prev, { id: 'b' }]) })
    expect(result.current.items).toEqual([{ id: 'b' }])
  })

  it('handleImportParentRecord no-op without parentImport config', () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ open: false })))
    act(() => { result.current.handleImportParentRecord([{ id: 'po-1' }]) })
  })
})

describe('useModuleEditorWorkspace effect initialization', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('initializes in create mode with autoInsert', async () => {
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ autoInsertBlankItemOnCreate: true })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    expect(result.current.items.length).toBeGreaterThanOrEqual(1)
    expect(result.current.isEdit).toBe(false)
  })

  it('initializes in edit mode', async () => {
    const record = { id: 'rec-1', orderNo: 'ORD-001', items: [{ id: 'i1' }] }
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ record })))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    expect(result.current.isEdit).toBe(true)
    expect(result.current.items).toEqual([{ id: 'i1' }])
  })

  it('generates primary number when primaryNoKey is set', async () => {
    const { generateBusinessPrimaryNo } = await import('@/api/business')
    renderHook(() => useModuleEditorWorkspace(props()))
    await vi.waitFor(() => expect(generateBusinessPrimaryNo).toHaveBeenCalled())
  })

  it('allocates snowflake primary when enabled', async () => {
    const { isDisplaySwitchEnabled } = await import('@/api/system-settings')
    const { allocateBusinessPrimaryNo } = await import('@/api/business')
    vi.mocked(isDisplaySwitchEnabled).mockReturnValue(true)
    renderHook(() => useModuleEditorWorkspace(props()))
    await vi.waitFor(() => expect(allocateBusinessPrimaryNo).toHaveBeenCalled())
  })

  it('skips primary number when no primaryNoKey', async () => {
    const { generateBusinessPrimaryNo } = await import('@/api/business')
    renderHook(() => useModuleEditorWorkspace(props({ config: cfg({ primaryNoKey: undefined }) })))
    await new Promise(r => setTimeout(r, 50))
    expect(generateBusinessPrimaryNo).not.toHaveBeenCalled()
  })

  it('opens parent selector with config', async () => {
    const parentImport = { parentModuleKey: 'po', parentFieldKey: 'poNo', label: 'PO' }
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ config: cfg({ parentImport }) })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    act(() => { result.current.openParentSelector() })
    expect(result.current.parentSelectorOpen).toBe(true)
    act(() => { result.current.closeParentSelector() })
    expect(result.current.parentSelectorOpen).toBe(false)
  })

  it('shows warning on parent selector validation failure', async () => {
    const parentImport = {
      parentModuleKey: 'po', parentFieldKey: 'poNo', label: 'PO',
      validateBeforeOpen: () => 'Fill required fields',
    }
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ config: cfg({ parentImport }) })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    act(() => { result.current.openParentSelector() })
    expect(result.current.parentSelectorOpen).toBe(false)
  })
})

describe('useModuleEditorWorkspace save', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('saves successfully in create mode', async () => {
    const onSaved = vi.fn()
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ onSaved })))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave() })
    expect(result.current.saving).toBe(false)
    expect(result.current.saveResult?.status).toBe('success')
    expect(onSaved).toHaveBeenCalled()
  })

  it('saves successfully in edit mode', async () => {
    const onSaved = vi.fn()
    const record = { id: 'rec-1', items: [] }
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ record, onSaved })))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave() })
    expect(result.current.saveResult?.status).toBe('success')
  })

  it('handles save API error', async () => {
    const { saveBusinessModule } = await import('@/api/business')
    vi.mocked(saveBusinessModule).mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useModuleEditorWorkspace(props()))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave() })
    expect(result.current.saveResult?.status).toBe('error')
    expect(result.current.saveResult?.message).toBe('Network error')
  })

  it('handles unknown error type on save', async () => {
    const { saveBusinessModule } = await import('@/api/business')
    vi.mocked(saveBusinessModule).mockRejectedValue('string error')
    const { result } = renderHook(() => useModuleEditorWorkspace(props()))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave() })
    expect(result.current.saveResult?.status).toBe('error')
  })

  it('handles save error with traceId', async () => {
    const { saveBusinessModule } = await import('@/api/business')
    const error = new Error('fail') as any
    error.traceId = 'trace-123'
    vi.mocked(saveBusinessModule).mockRejectedValue(error)
    const { result } = renderHook(() => useModuleEditorWorkspace(props()))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave() })
    expect(result.current.saveResult?.traceId).toBe('trace-123')
  })

  it('skips save when validation fails', async () => {
    const { getEditorValidationMessage } = await import('@/module-system/module-adapter-editor')
    vi.mocked(getEditorValidationMessage).mockReturnValue('Required field missing')
    const { result } = renderHook(() => useModuleEditorWorkspace(props()))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave() })
    expect(result.current.saveResult).toBeNull()
  })

  it('handles form validation error object', async () => {
    const f = frm()
    f.validateFields = vi.fn().mockRejectedValue({ errorFields: [{ errors: ['x'] }], values: {} })
    const { result } = renderHook(() => useModuleEditorWorkspace(props({ form: f })))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave() })
    expect(result.current.saveResult).toBeNull()
    expect(result.current.saving).toBe(false)
  })

  it('saves with audit when confirmed', async () => {
    const auditTarget = { key: 'status', value: '已审核' }
    const { modal } = await import('@/utils/antd-app')
    vi.mocked(modal.confirm).mockImplementation(({ onOk }: any) => { onOk?.() })
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ editorAuditTarget: auditTarget })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave(true) })
    expect(modal.confirm).toHaveBeenCalled()
    expect(result.current.saveResult?.status).toBe('success')
  })

  it('cancels audit save when cancelled', async () => {
    const auditTarget = { key: 'status', value: '已审核' }
    const { modal } = await import('@/utils/antd-app')
    vi.mocked(modal.confirm).mockImplementation(({ onCancel }: any) => { onCancel?.() })
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ editorAuditTarget: auditTarget })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleSave(true) })
    expect(result.current.saveResult).toBeNull()
  })
})

describe('useModuleEditorWorkspace parent import', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('imports parent records successfully', async () => {
    const parentImport = { parentModuleKey: 'po', parentFieldKey: 'poNo', label: 'PO' }
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ config: cfg({ parentImport }) })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleImportParentRecord([{ id: 'po-1' }]) })
    expect(result.current.parentImporting).toBe(false)
    expect(result.current.parentSelectorOpen).toBe(false)
  })

  it('warns when no records selected for import', async () => {
    const parentImport = { parentModuleKey: 'po', parentFieldKey: 'poNo', label: 'PO' }
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ config: cfg({ parentImport }) })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleImportParentRecord([]) })
    expect(result.current.parentImporting).toBe(false)
  })

  it('handles import API error', async () => {
    const parentImport = { parentModuleKey: 'po', parentFieldKey: 'poNo', label: 'PO' }
    const { getBusinessModuleDetail } = await import('@/api/business')
    vi.mocked(getBusinessModuleDetail).mockRejectedValue(new Error('Import failed'))
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ config: cfg({ parentImport }) })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleImportParentRecord([{ id: 'po-1' }]) })
    expect(result.current.parentImporting).toBe(false)
  })

  it('handles import with validation error from config', async () => {
    const parentImport = {
      parentModuleKey: 'po', parentFieldKey: 'poNo', label: 'PO',
      validateParentImport: () => 'Duplicate parent',
    }
    const { result } = renderHook(() =>
      useModuleEditorWorkspace(props({ config: cfg({ parentImport }) })),
    )
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleImportParentRecord([{ id: 'po-1' }]) })
    expect(result.current.parentImporting).toBe(false)
  })

  it('is no-op when no parentImport config', async () => {
    const { result } = renderHook(() => useModuleEditorWorkspace(props()))
    await vi.waitFor(() => expect(result.current.primaryNoLoading).toBe(false))
    await act(async () => { await result.current.handleImportParentRecord([{ id: 'x' }]) })
    expect(result.current.parentImporting).toBe(false)
  })
})
