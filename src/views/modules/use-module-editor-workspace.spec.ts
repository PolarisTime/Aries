import { useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  allocateBusinessPrimaryNo,
  generateBusinessPrimaryNo,
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
  saveBusinessModule,
} from '@/api/business'
import {
  isDisplaySwitchEnabled,
  listClientSettings,
  listSystemSettings,
} from '@/api/system-settings'
import {
  applyFormFieldDefaultDraftValues,
  applyModuleDefaultEditorDraft,
  buildDefaultEditorLineItem,
  getEditorValidationMessage,
  normalizeDraftRecordForModule,
  syncDerivedEditorFormValuesForModule,
  trimEditorItemsForModule,
} from '@/module-system/module-adapter-editor'
import { buildParentImportState } from '@/module-system/module-adapter-parent-import'
import { message, modal } from '@/utils/antd-app'
import { parseDateTimeValue } from '@/utils/formatters'
import { getStoredUser } from '@/utils/storage'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'

const mockFns = vi.hoisted(() => ({
  translate: (key: string) => key,
}))

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
  default: { t: mockFns.translate },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockFns.translate }),
}))

vi.mock('@/api/business', () => ({
  allocateBusinessPrimaryNo: vi
    .fn()
    .mockResolvedValue({ generatedNo: 'PRE-001', generatedId: 'pre-id-1' }),
  generateBusinessPrimaryNo: vi.fn().mockResolvedValue('GEN-001'),
  getBusinessModuleDetail: vi
    .fn()
    .mockResolvedValue({ data: { id: '1', items: [] } }),
  listAllBusinessModuleRows: vi.fn().mockResolvedValue([]),
  saveBusinessModule: vi
    .fn()
    .mockResolvedValue({ data: { id: 'saved-1', orderNo: 'ORD-001' } }),
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
    key: 'test-module',
    title: 'Test',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
    formFields: [],
    itemColumns: [],
    primaryNoKey: 'orderNo',
    ...overrides,
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
    open: true,
    config: cfg(),
    record: null,
    moduleKey: 'test-module',
    editorAuditTarget: null,
    form: frm(),
    onClose: vi.fn(),
    onSaved: vi.fn(),
    autoInsertBlankItemOnCreate: false,
    ...overrides,
  }
}

function renderWorkspace(overrides: Record<string, unknown> = {}) {
  const workspaceProps = props(overrides)
  return renderHook(() => useModuleEditorWorkspace(workspaceProps))
}

describe('useModuleEditorWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQuery).mockReturnValue({ data: [] } as never)
    vi.mocked(allocateBusinessPrimaryNo).mockResolvedValue({
      generatedNo: 'PRE-001',
      generatedId: 'pre-id-1',
    })
    vi.mocked(generateBusinessPrimaryNo).mockResolvedValue('GEN-001')
    vi.mocked(getBusinessModuleDetail).mockResolvedValue({
      data: { id: '1', items: [] },
    })
    vi.mocked(listAllBusinessModuleRows).mockResolvedValue([])
    vi.mocked(saveBusinessModule).mockResolvedValue({
      data: { id: 'saved-1', orderNo: 'ORD-001' },
    })
    vi.mocked(isDisplaySwitchEnabled).mockReturnValue(false)
    vi.mocked(applyFormFieldDefaultDraftValues).mockImplementation(() => {})
    vi.mocked(applyModuleDefaultEditorDraft).mockImplementation(() => {})
    vi.mocked(buildDefaultEditorLineItem).mockReturnValue({ id: 'new-item' })
    vi.mocked(getEditorValidationMessage).mockReturnValue(null)
    vi.mocked(normalizeDraftRecordForModule).mockImplementation(() => {})
    vi.mocked(syncDerivedEditorFormValuesForModule).mockReturnValue({})
    vi.mocked(trimEditorItemsForModule).mockReturnValue([])
    vi.mocked(buildParentImportState).mockReturnValue({
      parentNosText: '',
      shouldApplyMappedValues: false,
      mappedValues: {},
      nextItems: [],
      hasImportedCurrentParent: false,
      importedItemCount: 0,
    })
    vi.mocked(parseDateTimeValue).mockReturnValue(undefined)
    vi.mocked(getStoredUser).mockReturnValue(null)
  })

  it('can be imported', async () => {
    const mod = await import('@/views/modules/use-module-editor-workspace')
    expect(mod.useModuleEditorWorkspace).toBeDefined()
  })

  it('returns expected properties when open is false', () => {
    const { result } = renderWorkspace({ open: false })
    expect(result.current.saving).toBe(false)
    expect(result.current.parentSelectorOpen).toBe(false)
    expect(result.current.parentImporting).toBe(false)
    expect(result.current.primaryNoLoading).toBe(false)
    expect(result.current.saveResult).toBeNull()
    expect(result.current.isEdit).toBe(false)
    expect(result.current.items).toEqual([])
  })

  it('has all expected return properties', () => {
    const { result } = renderWorkspace({ open: false })
    const keys = [
      'addItem',
      'closeParentSelector',
      'handleImportParentRecord',
      'handleSave',
      'isEdit',
      'items',
      'openParentSelector',
      'parentImporting',
      'parentSelectorFilters',
      'parentSelectorOpen',
      'primaryNoLoading',
      'saveResult',
      'clearSaveResult',
      'saving',
      'setItems',
      'handleFormValuesChange',
    ]
    for (const k of keys) expect(result.current).toHaveProperty(k)
  })

  it('loads editor settings from public client settings only', () => {
    renderWorkspace({ open: false })

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['client'],
        queryFn: listClientSettings,
      }),
    )
    expect(useQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['general'],
        queryFn: listSystemSettings,
      }),
    )
  })

  it('starts with empty items in create mode without autoInsert', () => {
    const { result } = renderWorkspace({ open: false })
    expect(result.current.items).toEqual([])
    expect(result.current.isEdit).toBe(false)
  })

  it('clearSaveResult resets save result', () => {
    const { result } = renderWorkspace({ open: false })
    act(() => {
      result.current.clearSaveResult()
    })
    expect(result.current.saveResult).toBeNull()
  })

  it('handleFormValuesChange is callable when not open', () => {
    const { result } = renderWorkspace({ open: false })
    act(() => {
      result.current.handleFormValuesChange({ orderNo: 'X' })
    })
  })

  it('openParentSelector is no-op without parentImport config', () => {
    const { result } = renderWorkspace({ open: false })
    act(() => {
      result.current.openParentSelector()
    })
    expect(result.current.parentSelectorOpen).toBe(false)
  })

  it('closeParentSelector resets session', () => {
    const { result } = renderWorkspace({ open: false })
    act(() => {
      result.current.closeParentSelector()
    })
    expect(result.current.parentSelectorOpen).toBe(false)
  })

  it('setItems with array works', () => {
    const { result } = renderWorkspace({ open: false })
    act(() => {
      result.current.setItems([{ id: 'a' }])
    })
    expect(result.current.items).toEqual([{ id: 'a' }])
  })

  it('setItems with function updater works', () => {
    const { result } = renderWorkspace({ open: false })
    act(() => {
      result.current.setItems([])
    })
    act(() => {
      result.current.setItems((prev: unknown[]) => [...prev, { id: 'b' }])
    })
    expect(result.current.items).toEqual([{ id: 'b' }])
  })

  it('handleImportParentRecord no-op without parentImport config', () => {
    const { result } = renderWorkspace({ open: false })
    act(() => {
      result.current.handleImportParentRecord([{ id: 'po-1' }])
    })
  })

  it('initializes create form with generated primary number and blank item', async () => {
    const form = frm()
    const { result } = renderWorkspace({
      form,
      autoInsertBlankItemOnCreate: true,
    })

    expect(form.resetFields).toHaveBeenCalled()
    expect(result.current.primaryNoLoading).toBe(true)
    await waitFor(() => {
      expect(generateBusinessPrimaryNo).toHaveBeenCalledWith('test-module')
      expect(form.setFieldsValue).toHaveBeenCalledWith(
        expect.objectContaining({ orderNo: 'GEN-001' }),
      )
      expect(result.current.primaryNoLoading).toBe(false)
    })
    expect(result.current.items).toEqual([{ id: 'new-item' }])
  })

  it('uses snowflake preallocation when the client switch is enabled', async () => {
    vi.mocked(isDisplaySwitchEnabled).mockReturnValue(true)
    const form = frm()

    renderWorkspace({ form })

    await waitFor(() => {
      expect(allocateBusinessPrimaryNo).toHaveBeenCalledWith('test-module')
      expect(form.setFieldsValue).toHaveBeenCalledWith(
        expect.objectContaining({
          _preallocatedId: 'pre-id-1',
          orderNo: 'PRE-001',
        }),
      )
    })
  })

  it('normalizes date fields and loads line items in edit mode', () => {
    vi.mocked(parseDateTimeValue).mockReturnValue('parsed-date' as never)
    const form = frm()

    const { result } = renderWorkspace({
      form,
      record: {
        id: 'r-1',
        billDate: '2026-01-01',
        items: [{ id: 'line-1' }],
      },
      config: cfg({
        formFields: [{ key: 'billDate', type: 'date' }],
      }),
    })

    expect(form.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({ billDate: 'parsed-date' }),
    )
    expect(result.current.isEdit).toBe(true)
    expect(result.current.items).toEqual([{ id: 'line-1' }])
  })

  it('saves a valid draft and exposes success result', async () => {
    const form = frm()
    const onSaved = vi.fn()
    vi.mocked(trimEditorItemsForModule).mockReturnValue([{ id: 'line-1' }])
    const { result } = renderWorkspace({
      open: false,
      form,
      onSaved,
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(saveBusinessModule).toHaveBeenCalledWith(
      'test-module',
      expect.objectContaining({
        id: '',
        orderNo: 'ORD-001',
        items: [{ id: 'line-1' }],
      }),
    )
    expect(normalizeDraftRecordForModule).toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalled()
    expect(result.current.saveResult).toEqual(
      expect.objectContaining({
        status: 'success',
        record: { id: 'saved-1', orderNo: 'ORD-001' },
      }),
    )
  })

  it('keeps existing hidden fields when saving an edited record', async () => {
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: 'SO-001',
      customerName: '客户A',
    })
    vi.mocked(trimEditorItemsForModule).mockReturnValue([
      { id: 'line-1', unitPrice: 3300 },
    ])

    const { result } = renderWorkspace({
      open: false,
      form,
      record: {
        id: 'record-1',
        orderNo: 'SO-001',
        customerName: '客户A',
        purchaseOrderNo: 'PO-001',
        status: '已审核',
        items: [{ id: 'line-1', unitPrice: 3260 }],
      },
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(saveBusinessModule).toHaveBeenCalledWith(
      'test-module',
      expect.objectContaining({
        id: 'record-1',
        orderNo: 'SO-001',
        customerName: '客户A',
        purchaseOrderNo: 'PO-001',
        status: '已审核',
        items: [{ id: 'line-1', unitPrice: 3300 }],
      }),
    )
  })

  it('stops save and warns when editor validation fails', async () => {
    vi.mocked(getEditorValidationMessage).mockReturnValueOnce('缺少字段')
    const { result } = renderWorkspace({
      open: false,
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(message.warning).toHaveBeenCalledWith('缺少字段')
    expect(saveBusinessModule).not.toHaveBeenCalled()
  })

  it('applies audit target after confirmation when saving with audit', async () => {
    vi.mocked(modal.confirm).mockImplementation(
      ({ onOk }: { onOk: () => void }) => {
        onOk()
      },
    )
    const { result } = renderWorkspace({
      open: false,
      config: cfg({ primaryNoKey: '' }),
      editorAuditTarget: { key: 'status', value: '已审核' },
    })

    await act(async () => {
      await result.current.handleSave(true)
    })

    expect(modal.confirm).toHaveBeenCalled()
    expect(saveBusinessModule).toHaveBeenCalledWith(
      'test-module',
      expect.objectContaining({ status: '已审核' }),
    )
  })

  it('stores save error and trace id when persistence fails', async () => {
    vi.mocked(saveBusinessModule).mockRejectedValueOnce(
      Object.assign(new Error('保存失败'), { traceId: 'trace-1' }),
    )
    const { result } = renderWorkspace({
      open: false,
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toEqual({
      status: 'error',
      message: '保存失败',
      traceId: 'trace-1',
    })
  })

  it('opens parent selector with derived filters', () => {
    const form = frm()
    form.getFieldsValue.mockReturnValue({ supplierName: '供应商甲' })
    const { result } = renderWorkspace({
      form,
      config: cfg({
        parentImport: {
          parentModuleKey: 'purchase-order',
          label: '采购订单',
          parentFieldKey: 'sourceNos',
          parentDisplayFieldKey: 'orderNo',
          validateBeforeOpen: () => null,
          buildParentFilters: () => ({ supplierName: '供应商甲' }),
        },
      }),
    })

    act(() => {
      result.current.openParentSelector()
    })

    expect(result.current.parentSelectorOpen).toBe(true)
    expect(result.current.parentSelectorFilters).toEqual({
      supplierName: '供应商甲',
    })
  })

  it('warns instead of opening parent selector when precheck fails', () => {
    const { result } = renderWorkspace({
      config: cfg({
        parentImport: {
          parentModuleKey: 'purchase-order',
          label: '采购订单',
          parentFieldKey: 'sourceNos',
          parentDisplayFieldKey: 'orderNo',
          validateBeforeOpen: () => '先选择供应商',
        },
      }),
    })

    act(() => {
      result.current.openParentSelector()
    })

    expect(message.warning).toHaveBeenCalledWith('先选择供应商')
    expect(result.current.parentSelectorOpen).toBe(false)
  })

  it('imports selected parent records and syncs editor items', async () => {
    const form = frm()
    form.getFieldsValue.mockReturnValue({ id: 'draft-1', sourceNos: '' })
    vi.mocked(getBusinessModuleDetail).mockResolvedValue({
      data: { id: 'po-1', orderNo: 'PO-1', items: [{ id: 'source-line' }] },
    })
    vi.mocked(buildParentImportState).mockReturnValue({
      parentNosText: 'PO-1',
      shouldApplyMappedValues: true,
      mappedValues: { supplierName: '供应商甲' },
      nextItems: [{ id: 'line-1' }],
      hasImportedCurrentParent: false,
      importedItemCount: 1,
    })
    vi.mocked(syncDerivedEditorFormValuesForModule).mockImplementation(
      ({ record }) => record,
    )
    const { result } = renderWorkspace({
      form,
      config: cfg({
        parentImport: {
          parentModuleKey: 'purchase-order',
          label: '采购订单',
          parentFieldKey: 'sourceNos',
          parentDisplayFieldKey: 'orderNo',
        },
      }),
    })

    await act(async () => {
      await result.current.handleImportParentRecord([{ id: 'po-1' }])
    })

    expect(getBusinessModuleDetail).toHaveBeenCalledWith(
      'purchase-order',
      'po-1',
    )
    expect(form.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceNos: 'PO-1',
        supplierName: '供应商甲',
      }),
    )
    expect(result.current.items).toEqual([{ id: 'line-1' }])
    expect(message.success).toHaveBeenCalled()
  })

  it('warns when importing parent without selected records', async () => {
    const { result } = renderWorkspace({
      config: cfg({
        parentImport: {
          parentModuleKey: 'purchase-order',
          label: '采购订单',
          parentFieldKey: 'sourceNos',
          parentDisplayFieldKey: 'orderNo',
        },
      }),
    })

    await act(async () => {
      await result.current.handleImportParentRecord([])
    })

    expect(message.warning).toHaveBeenCalledWith('common.pleaseSelectWith')
    expect(getBusinessModuleDetail).not.toHaveBeenCalled()
  })

  it('syncs derived form values when item columns are enabled', () => {
    const form = frm()
    vi.mocked(syncDerivedEditorFormValuesForModule).mockReturnValue({
      amount: 100,
    })
    const { result } = renderWorkspace({
      form,
      config: cfg({
        primaryNoKey: '',
        itemColumns: [{ key: 'amount', title: '金额' }],
      }),
    })

    act(() => {
      result.current.addItem()
      result.current.handleFormValuesChange({ amount: 100 })
    })

    expect(syncDerivedEditorFormValuesForModule).toHaveBeenCalled()
    expect(form.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100 }),
    )
  })
})
