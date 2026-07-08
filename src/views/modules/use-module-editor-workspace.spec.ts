import { act, renderHook, waitFor } from '@testing-library/react'
import dayjs from 'dayjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  allocateBusinessPrimaryNo,
  generateBusinessPrimaryNo,
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
  saveBusinessModule,
} from '@/api/business'
import {
  fetchSettlementCompanyOptions,
  getCompanySettingProfile,
} from '@/api/company-settings'
import { useRuntimeConfig } from '@/hooks/useRuntimeConfig'
import {
  applyFormFieldDefaultDraftValues,
  applyModuleDefaultEditorDraft,
  buildDefaultEditorLineItem,
  getEditorValidationMessage,
  normalizeDraftRecordForModule,
  syncDerivedEditorFormValuesForModule,
  trimEditorItemsForModule,
} from '@/module-system/module-adapter-editor'
import {
  buildOccupiedParentMap,
  buildParentImportState,
} from '@/module-system/module-adapter-parent-import'
import {
  getModuleRecordPrimaryNo,
  parseParentRelationNos,
} from '@/module-system/module-adapter-shared'
import type { RuntimeConfigResponse } from '@/types/runtime-config'
import { message, modal } from '@/utils/antd-app'
import { parseDateTimeValue } from '@/utils/formatters'
import { getStoredUser } from '@/utils/storage'
import {
  readModuleEditorDraft,
  removeModuleEditorDraft,
  writeModuleEditorDraft,
} from '@/views/modules/module-editor-draft-storage'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'

const mockFns = vi.hoisted(() => ({
  translate: (key: string) => key,
}))

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

vi.mock('@/api/company-settings', () => ({
  fetchSettlementCompanyOptions: vi.fn().mockResolvedValue([]),
  getCompanySettingProfile: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/hooks/useModuleQueryRefresh', () => ({
  useModuleQueryRefresh: vi.fn().mockReturnValue({
    refreshModuleQueries: vi.fn(),
  }),
}))

vi.mock('@/hooks/useRuntimeConfig', () => ({
  useRuntimeConfig: vi.fn(),
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
  getStoredUser: vi.fn().mockReturnValue({
    id: 'user-1',
    loginName: 'tester',
  }),
}))

vi.mock('@/utils/client-autosave-registry', () => ({
  registerClientAutosaveHandler: vi.fn(() => vi.fn()),
}))

vi.mock('@/views/modules/module-editor-draft-storage', () => ({
  buildModuleEditorDraftSnapshot: vi.fn((args) => ({
    version: 1,
    userKey: args.userKey,
    moduleKey: args.moduleKey,
    recordId: args.recordId,
    values: args.values,
    items: args.items,
    chargeItems: args.chargeItems,
    authoritativePrimaryNo: args.authoritativePrimaryNo,
    updatedAt: args.now,
  })),
  getModuleEditorDraftRecordId: vi.fn((record) => String(record?.id || 'new')),
  readModuleEditorDraft: vi.fn().mockReturnValue(null),
  removeModuleEditorDraft: vi.fn(),
  resolveModuleEditorDraftUserKey: vi.fn(() => 'user-1'),
  writeModuleEditorDraft: vi.fn(),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: vi.fn((v: unknown) => String(v ?? '')),
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function runtimeConfig(
  overrides: { defaultTaxRate?: number; useSnowflakeId?: boolean } = {},
): RuntimeConfigResponse {
  return {
    ui: {
      defaultPageSize: 20,
      showSnowflakeId: false,
      watermark: {
        enabled: false,
        content: '{username}  {time}',
        fontSize: 18,
        color: 'rgba(0,0,0,0.08)',
        rotate: -22,
        density: 200,
      },
    },
    business: {
      defaultTaxRate: overrides.defaultTaxRate ?? 0.13,
      statement: {
        customerReceiptAmountZero: false,
        supplierFullPayment: false,
      },
      businessNo: {
        useSnowflakeId: overrides.useSnowflakeId ?? false,
      },
    },
    features: {
      weightOnlyPurchaseInbound: false,
      weightOnlySalesOutbound: false,
    },
  }
}

function mockRuntimeConfig(
  overrides: Parameters<typeof runtimeConfig>[0] = {},
) {
  vi.mocked(useRuntimeConfig).mockReturnValue({
    data: runtimeConfig(overrides),
  } as never)
}

function enableSnowflakeBusinessNo() {
  mockRuntimeConfig({ useSnowflakeId: true })
}

describe('useModuleEditorWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRuntimeConfig()
    vi.mocked(allocateBusinessPrimaryNo).mockResolvedValue({
      generatedNo: 'PRE-001',
      generatedId: 'pre-id-1',
    })
    vi.mocked(generateBusinessPrimaryNo).mockResolvedValue('GEN-001')
    vi.mocked(getBusinessModuleDetail).mockResolvedValue({
      data: { id: '1', items: [] },
    })
    vi.mocked(fetchSettlementCompanyOptions).mockResolvedValue([])
    vi.mocked(getCompanySettingProfile).mockResolvedValue(null)
    vi.mocked(listAllBusinessModuleRows).mockResolvedValue([])
    vi.mocked(saveBusinessModule).mockResolvedValue({
      data: { id: 'saved-1', orderNo: 'ORD-001' },
    })
    vi.mocked(modal.confirm).mockReset()
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
    vi.mocked(buildOccupiedParentMap).mockReturnValue({})
    vi.mocked(getModuleRecordPrimaryNo).mockReturnValue('')
    vi.mocked(parseParentRelationNos).mockReturnValue([])
    vi.mocked(parseDateTimeValue).mockReturnValue(undefined)
    vi.mocked(getStoredUser).mockReturnValue({
      id: 'user-1',
      loginName: 'tester',
    } as never)
    vi.mocked(readModuleEditorDraft).mockReturnValue(null)
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
      'chargeItems',
      'openParentSelector',
      'parentImporting',
      'parentSelectorFilters',
      'parentSelectorOpen',
      'primaryNoLoading',
      'authoritativePrimaryNo',
      'saveResult',
      'clearSaveResult',
      'saving',
      'setItems',
      'setChargeItems',
      'addChargeItem',
      'handleFormValuesChange',
      'flushEditorDraft',
    ]
    for (const k of keys) expect(result.current).toHaveProperty(k)
  })

  it('loads editor settings from runtime config', () => {
    renderWorkspace({ open: false })

    expect(useRuntimeConfig).toHaveBeenCalledTimes(1)
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

  it('ignores empty form changes when open', () => {
    const { result } = renderWorkspace({ config: cfg({ primaryNoKey: '' }) })

    act(() => {
      result.current.handleFormValuesChange({})
    })

    expect(syncDerivedEditorFormValuesForModule).not.toHaveBeenCalled()
    expect(writeModuleEditorDraft).not.toHaveBeenCalled()
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

  it('setChargeItems with function updater works independently from line items', () => {
    const { result } = renderWorkspace({ open: false })
    act(() => {
      result.current.setItems([{ id: 'line-1' }])
      result.current.setChargeItems([{ id: 'charge-1', chargeName: '运费' }])
    })
    act(() => {
      result.current.setChargeItems((prev: unknown[]) => [
        ...prev,
        { id: 'charge-2', chargeName: '卸货费' },
      ])
    })

    expect(result.current.items).toEqual([{ id: 'line-1' }])
    expect(result.current.chargeItems).toEqual([
      { id: 'charge-1', chargeName: '运费' },
      { id: 'charge-2', chargeName: '卸货费' },
    ])
  })

  it('adds an item without syncing when item columns are absent', () => {
    const { result } = renderWorkspace({ config: cfg({ primaryNoKey: '' }) })

    act(() => {
      result.current.addItem()
    })

    expect(result.current.items).toEqual([{ id: 'new-item' }])
    expect(syncDerivedEditorFormValuesForModule).not.toHaveBeenCalled()
  })

  it('uses the line item sum helper while syncing form values', () => {
    const form = frm()
    vi.mocked(syncDerivedEditorFormValuesForModule).mockImplementation(
      ({ items, sumLineItemsBy }) => ({
        quantityTotal: sumLineItemsBy(items, 'quantity'),
      }),
    )
    const { result } = renderWorkspace({
      form,
      config: cfg({ primaryNoKey: '' }),
    })

    act(() => {
      result.current.setItems([
        { id: 'line-1', quantity: 2 },
        { id: 'line-2', quantity: '3' },
        { id: 'line-3' },
      ])
    })
    act(() => {
      result.current.handleFormValuesChange({ customerName: '客户A' })
    })

    expect(form.setFieldsValue).toHaveBeenCalledWith({
      quantityTotal: 5,
    })
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
      moduleKey: 'purchase-order',
      autoInsertBlankItemOnCreate: true,
    })

    expect(form.resetFields).toHaveBeenCalled()
    expect(result.current.primaryNoLoading).toBe(true)
    await waitFor(() => {
      expect(generateBusinessPrimaryNo).toHaveBeenCalledWith('purchase-order')
      expect(form.setFieldsValue).toHaveBeenCalledWith(
        expect.objectContaining({ orderNo: 'GEN-001' }),
      )
      expect(result.current.primaryNoLoading).toBe(false)
    })
    expect(result.current.authoritativePrimaryNo).toBe('GEN-001')
    expect(result.current.items).toEqual([{ id: 'new-item' }])
  })

  it('uses snowflake preallocation when the client switch is enabled', async () => {
    enableSnowflakeBusinessNo()
    const form = frm()

    const { result } = renderWorkspace({ form, moduleKey: 'purchase-order' })

    await waitFor(() => {
      expect(allocateBusinessPrimaryNo).toHaveBeenCalledWith('purchase-order')
      expect(form.setFieldsValue).toHaveBeenCalledWith(
        expect.objectContaining({
          _preallocatedId: 'pre-id-1',
          orderNo: 'PRE-001',
        }),
      )
      expect(result.current.authoritativePrimaryNo).toBe('PRE-001')
    })
  })

  it('stores an empty preallocated id when allocator only returns a number', async () => {
    enableSnowflakeBusinessNo()
    vi.mocked(allocateBusinessPrimaryNo).mockResolvedValueOnce({
      generatedNo: 'PRE-ONLY',
      generatedId: '',
    })
    const form = frm()

    renderWorkspace({ form, moduleKey: 'purchase-order' })

    await waitFor(() => {
      expect(form.setFieldsValue).toHaveBeenCalledWith(
        expect.objectContaining({
          _preallocatedId: '',
          orderNo: 'PRE-ONLY',
        }),
      )
    })
  })

  it('does not mark non-system modules as authoritative after preallocation', async () => {
    enableSnowflakeBusinessNo()
    const { result } = renderWorkspace({ moduleKey: 'custom-module' })

    await waitFor(() => {
      expect(allocateBusinessPrimaryNo).toHaveBeenCalledWith('custom-module')
      expect(result.current.primaryNoLoading).toBe(false)
    })
    expect(result.current.authoritativePrimaryNo).toBe('')
  })

  it('reports generated primary number failures and clears loading', async () => {
    vi.mocked(generateBusinessPrimaryNo).mockRejectedValueOnce(
      new Error('生成失败'),
    )
    const { result } = renderWorkspace({ moduleKey: 'purchase-order' })

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('生成失败')
      expect(result.current.primaryNoLoading).toBe(false)
    })
  })

  it('reports fallback generated primary number failures for non-error values', async () => {
    vi.mocked(generateBusinessPrimaryNo).mockRejectedValueOnce('bad response')
    const { result } = renderWorkspace({ moduleKey: 'purchase-order' })

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('common.generateNoFailed')
      expect(result.current.primaryNoLoading).toBe(false)
    })
  })

  it('reports preallocated primary number failures and clears loading', async () => {
    enableSnowflakeBusinessNo()
    vi.mocked(allocateBusinessPrimaryNo).mockRejectedValueOnce(
      new Error('预生成失败'),
    )
    const { result } = renderWorkspace({ moduleKey: 'purchase-order' })

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('预生成失败')
      expect(result.current.primaryNoLoading).toBe(false)
    })
  })

  it('reports fallback preallocated primary number failures for non-error values', async () => {
    enableSnowflakeBusinessNo()
    vi.mocked(allocateBusinessPrimaryNo).mockRejectedValueOnce('bad response')
    const { result } = renderWorkspace({ moduleKey: 'purchase-order' })

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('common.preallocateNoFailed')
      expect(result.current.primaryNoLoading).toBe(false)
    })
  })

  it('does not apply generated primary numbers after unmount', async () => {
    const generated = deferred<string>()
    vi.mocked(generateBusinessPrimaryNo).mockReturnValueOnce(generated.promise)
    const form = frm()
    const { result, unmount } = renderWorkspace({
      form,
      moduleKey: 'purchase-order',
    })

    expect(result.current.primaryNoLoading).toBe(true)
    unmount()

    await act(async () => {
      generated.resolve('GEN-LATE')
      await generated.promise
    })

    expect(form.setFieldsValue).not.toHaveBeenCalledWith(
      expect.objectContaining({ orderNo: 'GEN-LATE' }),
    )
  })

  it('does not report generated primary number failures after unmount', async () => {
    const generated = deferred<string>()
    vi.mocked(generateBusinessPrimaryNo).mockReturnValueOnce(generated.promise)
    const { unmount } = renderWorkspace({ moduleKey: 'purchase-order' })

    unmount()

    await act(async () => {
      generated.reject(new Error('late failure'))
      await generated.promise.catch(() => undefined)
    })

    expect(message.error).not.toHaveBeenCalledWith('late failure')
  })

  it('does not apply preallocated primary numbers after unmount', async () => {
    enableSnowflakeBusinessNo()
    const preallocated = deferred<{
      generatedNo: string
      generatedId: string
    }>()
    vi.mocked(allocateBusinessPrimaryNo).mockReturnValueOnce(
      preallocated.promise,
    )
    const form = frm()
    const { result, unmount } = renderWorkspace({
      form,
      moduleKey: 'purchase-order',
    })

    expect(result.current.primaryNoLoading).toBe(true)
    unmount()

    await act(async () => {
      preallocated.resolve({ generatedNo: 'PRE-LATE', generatedId: 'id-late' })
      await preallocated.promise
    })

    expect(form.setFieldsValue).not.toHaveBeenCalledWith(
      expect.objectContaining({ orderNo: 'PRE-LATE' }),
    )
  })

  it('does not report preallocated primary number failures after unmount', async () => {
    enableSnowflakeBusinessNo()
    const preallocated = deferred<{
      generatedNo: string
      generatedId: string
    }>()
    vi.mocked(allocateBusinessPrimaryNo).mockReturnValueOnce(
      preallocated.promise,
    )
    const { unmount } = renderWorkspace({ moduleKey: 'purchase-order' })

    unmount()

    await act(async () => {
      preallocated.reject(new Error('late preallocate failure'))
      await preallocated.promise.catch(() => undefined)
    })

    expect(message.error).not.toHaveBeenCalledWith('late preallocate failure')
  })

  it('defaults purchase order settlement company from current company', async () => {
    vi.mocked(getCompanySettingProfile).mockResolvedValue({
      id: '8',
      companyName: '结算主体A',
      taxNo: 'T',
      settlementAccounts: [],
      status: '正常',
    })
    const form = frm()
    form.getFieldsValue.mockReturnValue({ id: 'fv', orderNo: 'ORD-001' })

    renderWorkspace({ form, moduleKey: 'purchase-order' })

    await waitFor(() => {
      expect(form.setFieldsValue).toHaveBeenCalledWith({
        settlementCompanyId: '8',
        settlementCompanyName: '结算主体A',
      })
    })
    expect(fetchSettlementCompanyOptions).not.toHaveBeenCalled()
  })

  it('falls back to first settlement company option for purchase order default', async () => {
    vi.mocked(getCompanySettingProfile).mockResolvedValue(null)
    vi.mocked(fetchSettlementCompanyOptions).mockResolvedValue([
      {
        id: '9',
        value: '9',
        label: '结算主体B',
        companyName: '结算主体B',
      },
    ])
    const form = frm()
    form.getFieldsValue.mockReturnValue({ id: 'fv', orderNo: 'ORD-001' })

    renderWorkspace({ form, moduleKey: 'purchase-order' })

    await waitFor(() => {
      expect(form.setFieldsValue).toHaveBeenCalledWith({
        settlementCompanyId: '9',
        settlementCompanyName: '结算主体B',
      })
    })
  })

  it('does not overwrite an existing settlement company default', async () => {
    vi.mocked(getCompanySettingProfile).mockResolvedValue({
      id: '8',
      companyName: '结算主体A',
      taxNo: 'T',
      settlementAccounts: [],
      status: '正常',
    })
    const form = frm()
    form.getFieldsValue.mockReturnValue({
      id: 'fv',
      settlementCompanyId: 'exists',
    })

    renderWorkspace({
      form,
      moduleKey: 'purchase-order',
      config: cfg({ primaryNoKey: '' }),
    })

    await waitFor(() => {
      expect(getCompanySettingProfile).toHaveBeenCalled()
    })
    expect(form.setFieldsValue).not.toHaveBeenCalledWith({
      settlementCompanyId: '8',
      settlementCompanyName: '结算主体A',
    })
  })

  it('ignores missing settlement defaults and lookup failures', async () => {
    vi.mocked(getCompanySettingProfile).mockRejectedValueOnce(
      new Error('profile unavailable'),
    )
    vi.mocked(fetchSettlementCompanyOptions).mockResolvedValueOnce([])
    const form = frm()

    renderWorkspace({
      form,
      moduleKey: 'purchase-order',
      config: cfg({ primaryNoKey: '' }),
    })

    await waitFor(() => {
      expect(fetchSettlementCompanyOptions).toHaveBeenCalled()
    })
    expect(form.setFieldsValue).not.toHaveBeenCalledWith(
      expect.objectContaining({ settlementCompanyId: expect.anything() }),
    )

    vi.clearAllMocks()
    vi.mocked(readModuleEditorDraft).mockReturnValue(null)
    vi.mocked(getCompanySettingProfile).mockResolvedValueOnce(null)
    vi.mocked(fetchSettlementCompanyOptions).mockRejectedValueOnce(
      new Error('options unavailable'),
    )

    renderWorkspace({
      form,
      moduleKey: 'purchase-order',
      config: cfg({ primaryNoKey: '' }),
    })

    await waitFor(() => {
      expect(fetchSettlementCompanyOptions).toHaveBeenCalled()
    })
    expect(message.error).not.toHaveBeenCalled()
  })

  it('uses the fallback operator name when no stored user name is available', () => {
    vi.mocked(getStoredUser).mockReturnValue({ id: 'user-1' } as never)

    renderWorkspace({
      config: cfg({ primaryNoKey: '' }),
    })

    expect(applyModuleDefaultEditorDraft).toHaveBeenCalledWith(
      'test-module',
      {},
      'modules.editorWorkspace.currentUserFallback',
    )

    vi.mocked(getStoredUser).mockReturnValue(null as never)
    renderWorkspace({
      config: cfg({ primaryNoKey: '' }),
    })

    expect(applyModuleDefaultEditorDraft).toHaveBeenLastCalledWith(
      'test-module',
      {},
      'modules.editorWorkspace.currentUserFallback',
    )
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
        chargeItems: [{ id: 'charge-1', chargeName: '卸货费', amount: 120 }],
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
    expect(result.current.chargeItems).toEqual([
      { id: 'charge-1', chargeName: '卸货费', amount: 120 },
    ])
  })

  it('uses empty line items when editing a record without items', () => {
    const { result } = renderWorkspace({
      record: {
        id: 'r-1',
        orderNo: 'ORD-001',
      },
      config: cfg({ primaryNoKey: '' }),
    })

    expect(result.current.items).toEqual([])
    expect(result.current.chargeItems).toEqual([])
  })

  it('skips non-date and already normalized date values while loading records', () => {
    const parsedDay = dayjs('2026-01-03')
    vi.mocked(parseDateTimeValue).mockReturnValue(undefined)
    const form = frm()

    renderWorkspace({
      form,
      record: {
        id: 'r-1',
        textField: 'plain',
        emptyDate: '',
        nullDate: null,
        parsedDay,
        invalidDate: 'not-a-date',
        items: [],
      },
      config: cfg({
        formFields: [
          { key: 'textField', type: 'text' },
          { key: 'emptyDate', type: 'date' },
          { key: 'nullDate', type: 'date' },
          { key: 'parsedDay', type: 'date' },
          { key: 'invalidDate', type: 'date' },
        ],
      }),
    })

    expect(parseDateTimeValue).toHaveBeenCalledTimes(1)
    expect(parseDateTimeValue).toHaveBeenCalledWith('not-a-date')
    expect(form.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        textField: 'plain',
        emptyDate: '',
        nullDate: null,
        parsedDay,
        invalidDate: undefined,
      }),
    )
  })

  it('keeps original time when saving an edited date-only field', async () => {
    vi.mocked(parseDateTimeValue).mockImplementation((value) => dayjs(value))
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: 'ORD-001',
      billDate: dayjs('2026-01-02'),
    })

    const { result } = renderWorkspace({
      open: false,
      form,
      record: {
        id: 'r-1',
        orderNo: 'ORD-001',
        billDate: '2026-01-01 12:34:56',
      },
      config: cfg({
        primaryNoKey: '',
        formFields: [{ key: 'billDate', label: '单据日期', type: 'date' }],
      }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(saveBusinessModule).toHaveBeenCalledWith(
      'test-module',
      expect.objectContaining({
        billDate: expect.objectContaining({
          format: expect.any(Function),
        }),
      }),
    )
    const savedRecord = vi.mocked(saveBusinessModule).mock.calls[0]?.[1]
    expect(savedRecord?.billDate).toBeDefined()
    expect(dayjs.isDayjs(savedRecord?.billDate)).toBe(true)
    expect(dayjs(savedRecord?.billDate).format('YYYY-MM-DD HH:mm:ss')).toBe(
      '2026-01-02 12:34:56',
    )
  })

  it('merges date-only field time from supported source value shapes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 4, 9, 8, 7))
    vi.mocked(parseDateTimeValue).mockImplementation((value) => {
      if (value instanceof Date) return dayjs(value)
      if (value === 20260101111213) return dayjs('2026-01-01 11:12:13')
      if (value === '20260101141516') return dayjs('2026-01-01 14:15:16')
      return dayjs(value)
    })
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: 'ORD-001',
      fromDayjs: dayjs('2026-02-02'),
      fromDate: dayjs('2026-02-02'),
      fromDateOnlyNumber: dayjs('2026-02-02'),
      fromTimestampNumber: dayjs('2026-02-02'),
      fromCompactString: dayjs('2026-02-02'),
      fromInvalidSource: dayjs('2026-02-02'),
      invalidValue: dayjs('invalid'),
      plainValue: '2026-02-02',
    })

    const { result } = renderWorkspace({
      open: false,
      form,
      record: {
        id: 'r-1',
        orderNo: 'ORD-001',
        fromDayjs: dayjs('2026-01-01 01:02:03'),
        fromDate: new Date(2026, 0, 1, 4, 5, 6),
        fromDateOnlyNumber: 20260101,
        fromTimestampNumber: 20260101111213,
        fromCompactString: '20260101141516',
        fromInvalidSource: dayjs('invalid'),
      },
      config: cfg({
        primaryNoKey: '',
        formFields: [
          { key: 'fromDayjs', label: 'A', type: 'date' },
          { key: 'fromDate', label: 'B', type: 'date' },
          { key: 'fromDateOnlyNumber', label: 'C', type: 'date' },
          { key: 'fromTimestampNumber', label: 'D', type: 'date' },
          { key: 'fromCompactString', label: 'E', type: 'date' },
          { key: 'fromInvalidSource', label: 'F', type: 'date' },
          { key: 'invalidValue', label: 'G', type: 'date' },
          { key: 'plainValue', label: 'H', type: 'date' },
        ],
      }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    const savedRecord = vi.mocked(saveBusinessModule).mock.calls[0]?.[1]
    expect(dayjs(savedRecord?.fromDayjs).format('HH:mm:ss')).toBe('01:02:03')
    expect(dayjs(savedRecord?.fromDate).format('HH:mm:ss')).toBe('04:05:06')
    expect(dayjs(savedRecord?.fromDateOnlyNumber).format('HH:mm:ss')).toBe(
      '09:08:07',
    )
    expect(dayjs(savedRecord?.fromTimestampNumber).format('HH:mm:ss')).toBe(
      '11:12:13',
    )
    expect(dayjs(savedRecord?.fromCompactString).format('HH:mm:ss')).toBe(
      '14:15:16',
    )
    expect(dayjs(savedRecord?.fromInvalidSource).format('HH:mm:ss')).toBe(
      '09:08:07',
    )
    expect(savedRecord?.plainValue).toBe('2026-02-02')
    vi.useRealTimers()
  })

  it('fills current time when saving a new date-only field', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 4, 9, 8, 7))
    vi.mocked(parseDateTimeValue).mockImplementation((value) => dayjs(value))
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: 'ORD-001',
      billDate: dayjs('2026-01-02'),
    })

    const { result } = renderWorkspace({
      open: false,
      form,
      config: cfg({
        primaryNoKey: '',
        formFields: [{ key: 'billDate', label: '单据日期', type: 'date' }],
      }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    const savedRecord = vi.mocked(saveBusinessModule).mock.calls[0]?.[1]
    expect(dayjs(savedRecord?.billDate).format('YYYY-MM-DD HH:mm:ss')).toBe(
      '2026-01-02 09:08:07',
    )
    vi.useRealTimers()
  })

  it('preserves explicitly selected time when date field enables showTime', async () => {
    vi.mocked(parseDateTimeValue).mockImplementation((value) => dayjs(value))
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: 'ORD-001',
      billDate: dayjs('2026-01-02 03:04:05'),
    })

    const { result } = renderWorkspace({
      open: false,
      form,
      record: {
        id: 'r-1',
        orderNo: 'ORD-001',
        billDate: '2026-01-01 12:34:56',
      },
      config: cfg({
        primaryNoKey: '',
        formFields: [
          { key: 'billDate', label: '单据时间', type: 'date', showTime: true },
        ],
      }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    const savedRecord = vi.mocked(saveBusinessModule).mock.calls[0]?.[1]
    expect(dayjs(savedRecord?.billDate).format('YYYY-MM-DD HH:mm:ss')).toBe(
      '2026-01-02 03:04:05',
    )
  })

  it('uses the original server primary number when saving an edited document', async () => {
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: 'TAMPERED',
      customerName: '客户A',
    })

    const { result } = renderWorkspace({
      open: false,
      form,
      moduleKey: 'sales-order',
      record: {
        id: 'record-1',
        orderNo: 'SO-001',
        customerName: '客户A',
        items: [],
      },
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(form.setFieldsValue).toHaveBeenCalledWith({ orderNo: 'SO-001' })
    expect(saveBusinessModule).toHaveBeenCalledWith(
      'sales-order',
      expect.objectContaining({
        id: 'record-1',
        orderNo: 'SO-001',
      }),
    )
  })

  it('uses the generated server primary number when saving a new document', async () => {
    const form = frm()
    form.validateFields.mockResolvedValue({ orderNo: 'TAMPERED' })
    const { result } = renderWorkspace({
      open: true,
      form,
      moduleKey: 'purchase-order',
    })

    await waitFor(() => {
      expect(result.current.authoritativePrimaryNo).toBe('GEN-001')
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(form.setFieldsValue).toHaveBeenCalledWith({ orderNo: 'GEN-001' })
    expect(saveBusinessModule).toHaveBeenCalledWith(
      'purchase-order',
      expect.objectContaining({
        id: '',
        orderNo: 'GEN-001',
      }),
    )
  })

  it('keeps successful snowflake saves quiet when the preallocated id is preserved', async () => {
    enableSnowflakeBusinessNo()
    vi.mocked(saveBusinessModule).mockResolvedValueOnce({
      data: { id: 'pre-id-1', orderNo: '' },
    })
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: '',
      _preallocatedId: 'pre-id-1',
    })
    const { result } = renderWorkspace({
      open: false,
      form,
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toEqual(
      expect.objectContaining({
        status: 'success',
        record: { id: 'pre-id-1', orderNo: '' },
      }),
    )
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
    expect(removeModuleEditorDraft).toHaveBeenCalledWith(
      'user-1',
      'test-module',
      'new',
    )
  })

  it('saves charge items independently from line items', async () => {
    const form = frm()
    vi.mocked(trimEditorItemsForModule).mockReturnValue([{ id: 'line-1' }])
    const { result } = renderWorkspace({
      open: false,
      form,
      config: cfg({ primaryNoKey: '' }),
    })

    act(() => {
      result.current.setChargeItems([
        { id: 'charge-1', chargeName: '卸货费', amount: 120 },
      ])
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(saveBusinessModule).toHaveBeenCalledWith(
      'test-module',
      expect.objectContaining({
        items: [{ id: 'line-1' }],
        chargeItems: [{ id: 'charge-1', chargeName: '卸货费', amount: 120 }],
      }),
    )
  })

  it('blocks saving while the primary number is loading', async () => {
    const generated = deferred<string>()
    vi.mocked(generateBusinessPrimaryNo).mockReturnValueOnce(generated.promise)
    const { result } = renderWorkspace({ moduleKey: 'purchase-order' })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(message.warning).toHaveBeenCalledWith('common.primaryNoGenerating')
    expect(saveBusinessModule).not.toHaveBeenCalled()

    await act(async () => {
      generated.resolve('GEN-001')
      await generated.promise
    })
  })

  it('checks occupied parent relations before saving when uniqueness is enforced', async () => {
    vi.mocked(listAllBusinessModuleRows).mockResolvedValueOnce([
      { id: 'other-1', sourceNos: 'PO-1' },
    ])
    vi.mocked(buildOccupiedParentMap).mockReturnValueOnce({
      'PO-1': { id: 'other-1', sourceNos: 'PO-1' },
    })
    const { result } = renderWorkspace({
      open: false,
      record: { id: 'current-1', orderNo: 'ORD-001', items: [] },
      config: cfg({
        primaryNoKey: '',
        parentImport: {
          parentModuleKey: 'purchase-order',
          label: '采购订单',
          parentFieldKey: 'sourceNos',
          parentDisplayFieldKey: 'orderNo',
          enforceUniqueRelation: true,
        },
      }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(listAllBusinessModuleRows).toHaveBeenCalledWith('test-module', {})
    expect(buildOccupiedParentMap).toHaveBeenCalledWith(
      [{ id: 'other-1', sourceNos: 'PO-1' }],
      'sourceNos',
      'current-1',
    )
    expect(getEditorValidationMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        occupiedParentMap: {
          'PO-1': { id: 'other-1', sourceNos: 'PO-1' },
        },
      }),
    )
  })

  it('checks occupied parent relations without excluding a record in create mode', async () => {
    const { result } = renderWorkspace({
      open: false,
      config: cfg({
        primaryNoKey: '',
        parentImport: {
          parentModuleKey: 'purchase-order',
          label: '采购订单',
          parentFieldKey: 'sourceNos',
          parentDisplayFieldKey: 'orderNo',
          enforceUniqueRelation: true,
        },
      }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(buildOccupiedParentMap).toHaveBeenCalledWith(
      [],
      'sourceNos',
      undefined,
    )
  })

  it('continues saving when occupied parent relation lookup fails', async () => {
    vi.mocked(listAllBusinessModuleRows).mockRejectedValueOnce(
      new Error('lookup failed'),
    )
    const { result } = renderWorkspace({
      open: false,
      config: cfg({
        primaryNoKey: '',
        parentImport: {
          parentModuleKey: 'purchase-order',
          label: '采购订单',
          parentFieldKey: 'sourceNos',
          parentDisplayFieldKey: 'orderNo',
          enforceUniqueRelation: true,
        },
      }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(saveBusinessModule).toHaveBeenCalled()
  })

  it('passes configured field and item metadata to editor validation', async () => {
    enableSnowflakeBusinessNo()
    const { result } = renderWorkspace({
      open: false,
      config: cfg({
        formFields: [{ key: 'customerName', label: '客户', type: 'text' }],
        itemColumns: [{ key: 'quantity', title: '数量' }],
      }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    const validationArgs = vi.mocked(getEditorValidationMessage).mock
      .calls[0]?.[0]
    expect(validationArgs).toEqual(
      expect.objectContaining({
        fields: [{ key: 'customerName', label: '客户', type: 'text' }],
        hasItemColumns: true,
        itemColumns: [{ key: 'quantity', title: '数量' }],
        skipRequiredFieldKeys: ['orderNo'],
      }),
    )
    validationArgs?.getPrimaryNo({ orderNo: 'ORD-X' })
    expect(getModuleRecordPrimaryNo).toHaveBeenCalledWith(
      { orderNo: 'ORD-X' },
      'orderNo',
    )
  })

  it('passes empty form fields to validation when config omits them', async () => {
    const { result } = renderWorkspace({
      open: false,
      config: cfg({ primaryNoKey: '', formFields: undefined }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(getEditorValidationMessage).toHaveBeenCalledWith(
      expect.objectContaining({ fields: [] }),
    )
  })

  it('confirms and saves sales orders with zero unit price items', async () => {
    vi.mocked(trimEditorItemsForModule).mockReturnValue([
      { id: 'line-1', unitPrice: 0 },
      { id: 'line-1b', unitPrice: '0' },
      { id: 'line-2' },
    ])
    vi.mocked(modal.confirm).mockImplementation(
      ({ onOk }: { onOk: () => void }) => {
        onOk()
      },
    )
    const { result } = renderWorkspace({
      open: false,
      moduleKey: 'sales-order',
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '价格待定提醒',
        content: '当前 3 条明细单价为 0，将以「待定价」状态保存。确认继续吗？',
      }),
    )
    expect(saveBusinessModule).toHaveBeenCalled()
  })

  it('cancels sales order save when zero price confirmation is rejected', async () => {
    vi.mocked(trimEditorItemsForModule).mockReturnValue([
      { id: 'line-1', unitPrice: 0 },
    ])
    vi.mocked(modal.confirm).mockImplementation(
      ({ onCancel }: { onCancel: () => void }) => {
        onCancel()
      },
    )
    const { result } = renderWorkspace({
      open: false,
      moduleKey: 'sales-order',
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(saveBusinessModule).not.toHaveBeenCalled()
  })

  it('cancels audit save when confirmation is rejected', async () => {
    vi.mocked(modal.confirm).mockImplementation(
      ({ onCancel }: { onCancel: () => void }) => {
        onCancel()
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

    expect(saveBusinessModule).not.toHaveBeenCalled()
  })

  it('sets a warning save result when preallocated identity is replaced', async () => {
    enableSnowflakeBusinessNo()
    vi.mocked(saveBusinessModule).mockResolvedValueOnce({
      data: { id: 'saved-id', orderNo: 'SERVER-001' },
    })
    vi.mocked(getModuleRecordPrimaryNo).mockReturnValueOnce('SERVER-001')
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: 'PRE-001',
      _preallocatedId: 'pre-id-1',
    })
    const { result } = renderWorkspace({
      open: false,
      form,
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toEqual(
      expect.objectContaining({
        status: 'warning',
        message: 'modules.editorWorkspace.preallocatedNoUpdatedContent',
        record: { id: 'saved-id', orderNo: 'SERVER-001' },
      }),
    )
  })

  it('uses the returned id in preallocated replacement warnings when no primary number is returned', async () => {
    enableSnowflakeBusinessNo()
    vi.mocked(saveBusinessModule).mockResolvedValueOnce({
      data: { id: 'server-id' },
    })
    const form = frm()
    form.validateFields.mockResolvedValue({
      orderNo: '',
      _preallocatedId: 'pre-id-1',
    })
    const { result } = renderWorkspace({
      open: false,
      form,
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toEqual(
      expect.objectContaining({
        status: 'warning',
        message: 'modules.editorWorkspace.preallocatedNoUpdatedContent',
      }),
    )
  })

  it('warns when a snowflake save lacks preallocated identity', async () => {
    enableSnowflakeBusinessNo()
    vi.mocked(saveBusinessModule).mockResolvedValueOnce({
      data: { id: 'saved-id', orderNo: 'SERVER-001' },
    })
    vi.mocked(getModuleRecordPrimaryNo).mockReturnValueOnce('SERVER-001')
    const { result } = renderWorkspace({
      open: false,
      config: cfg({ primaryNoKey: 'orderNo' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toEqual(
      expect.objectContaining({
        status: 'warning',
        message: 'modules.editorWorkspace.preallocatedNoMismatchContent',
      }),
    )
  })

  it('warns with no number content when a snowflake save lacks all returned identifiers', async () => {
    enableSnowflakeBusinessNo()
    vi.mocked(saveBusinessModule).mockResolvedValueOnce({
      data: undefined,
    } as never)
    const { result } = renderWorkspace({
      open: false,
      config: cfg({ primaryNoKey: 'orderNo' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toEqual(
      expect.objectContaining({
        status: 'warning',
        message: 'modules.editorWorkspace.preallocatedNoMismatchContentNoNo',
      }),
    )
  })

  it('stores generic save error for non-error rejections', async () => {
    vi.mocked(saveBusinessModule).mockRejectedValueOnce('bad response')
    const { result } = renderWorkspace({
      open: false,
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toEqual({
      status: 'error',
      message: 'common.saveFailedRetry',
    })
  })

  it('does not set save result for antd form validation errors', async () => {
    const form = frm()
    form.validateFields.mockRejectedValueOnce({
      errorFields: [{ name: ['orderNo'], errors: ['必填'] }],
      values: { orderNo: '' },
    })
    const { result } = renderWorkspace({
      open: false,
      form,
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toBeNull()
    expect(saveBusinessModule).not.toHaveBeenCalled()
  })

  it('autosaves current editor draft without validating or calling persistence api', () => {
    const form = frm()
    form.getFieldsValue.mockReturnValue({
      id: '',
      orderNo: 'ORD-001',
      customerName: '客户A',
    })
    const { result } = renderWorkspace({
      form,
      moduleKey: 'sales-order',
      config: cfg({ primaryNoKey: 'orderNo' }),
    })

    act(() => {
      result.current.setItems([{ id: 'line-1', quantity: 2 }])
    })
    act(() => {
      result.current.flushEditorDraft('error-boundary')
    })

    expect(writeModuleEditorDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        userKey: 'user-1',
        moduleKey: 'sales-order',
        recordId: 'new',
        values: expect.objectContaining({
          orderNo: 'ORD-001',
          customerName: '客户A',
        }),
        items: [{ id: 'line-1', quantity: 2 }],
      }),
    )
    expect(form.validateFields).not.toHaveBeenCalled()
    expect(saveBusinessModule).not.toHaveBeenCalled()
  })

  it('does not write an autosave draft when editor is closed', () => {
    const { result } = renderWorkspace({ open: false })

    act(() => {
      result.current.flushEditorDraft('manual')
    })

    expect(writeModuleEditorDraft).not.toHaveBeenCalled()
  })

  it('swallows autosave draft write failures', () => {
    vi.mocked(writeModuleEditorDraft).mockImplementationOnce(() => {
      throw new Error('quota exceeded')
    })
    const { result } = renderWorkspace({
      config: cfg({ primaryNoKey: '' }),
    })

    expect(() => {
      act(() => {
        result.current.flushEditorDraft('manual')
      })
    }).not.toThrow()
  })

  it('restores a saved editor draft after user confirmation', () => {
    vi.mocked(readModuleEditorDraft).mockReturnValue({
      version: 1,
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values: { id: '', orderNo: 'LOCAL-001', customerName: '本地客户' },
      items: [{ id: 'line-local', quantity: 3 }],
      authoritativePrimaryNo: 'LOCAL-001',
      updatedAt: 1000,
    })
    const form = frm()

    const { result } = renderWorkspace({
      form,
      moduleKey: 'sales-order',
      config: cfg({ primaryNoKey: 'orderNo' }),
    })

    expect(modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'modules.editorWorkspace.recoverDraftTitle',
        okText: 'modules.editorWorkspace.recoverDraftOk',
      }),
    )
    const confirmOptions = vi.mocked(modal.confirm).mock.calls[0]?.[0] as {
      onOk: () => void
    }
    act(() => {
      confirmOptions.onOk()
    })

    expect(form.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'LOCAL-001',
        customerName: '本地客户',
      }),
    )
    expect(result.current.items).toEqual([{ id: 'line-local', quantity: 3 }])
    expect(result.current.authoritativePrimaryNo).toBe('LOCAL-001')
    expect(generateBusinessPrimaryNo).not.toHaveBeenCalled()
  })

  it('ignores saved draft recovery callbacks after unmount', () => {
    vi.mocked(readModuleEditorDraft).mockReturnValue({
      version: 1,
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values: { id: '', orderNo: 'LOCAL-001' },
      items: [{ id: 'line-local' }],
      authoritativePrimaryNo: 'LOCAL-001',
      updatedAt: 1000,
    })
    const form = frm()

    const { result, unmount } = renderWorkspace({
      form,
      moduleKey: 'sales-order',
      config: cfg({ primaryNoKey: 'orderNo' }),
    })
    const confirmOptions = vi.mocked(modal.confirm).mock.calls[0]?.[0] as {
      onOk: () => void
      onCancel: () => void
    }

    unmount()

    act(() => {
      confirmOptions.onOk()
      confirmOptions.onCancel()
    })

    expect(result.current.items).toEqual([])
    expect(form.setFieldsValue).not.toHaveBeenCalledWith(
      expect.objectContaining({ orderNo: 'LOCAL-001' }),
    )
  })

  it('discards a saved editor draft and initializes a fresh editor when user cancels recovery', () => {
    vi.mocked(readModuleEditorDraft).mockReturnValue({
      version: 1,
      userKey: 'user-1',
      moduleKey: 'sales-order',
      recordId: 'new',
      values: { id: '', orderNo: 'LOCAL-001' },
      items: [{ id: 'line-local' }],
      authoritativePrimaryNo: 'LOCAL-001',
      updatedAt: 1000,
    })
    const form = frm()

    renderWorkspace({
      form,
      moduleKey: 'sales-order',
      config: cfg({ primaryNoKey: '' }),
    })

    const confirmOptions = vi.mocked(modal.confirm).mock.calls[0]?.[0] as {
      onCancel: () => void
    }
    act(() => {
      confirmOptions.onCancel()
    })

    expect(removeModuleEditorDraft).toHaveBeenCalledWith(
      'user-1',
      'sales-order',
      'new',
    )
    expect(form.resetFields).toHaveBeenCalled()
    expect(form.setFieldsValue).toHaveBeenCalledWith({})
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

  it('stores fallback save error text when an Error has no message', async () => {
    vi.mocked(saveBusinessModule).mockRejectedValueOnce(new Error(''))
    const { result } = renderWorkspace({
      open: false,
      config: cfg({ primaryNoKey: '' }),
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(result.current.saveResult).toEqual({
      status: 'error',
      message: 'common.saveFailed',
      traceId: undefined,
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

  it('opens parent selector with empty filters when no filter builder is configured', () => {
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

    act(() => {
      result.current.openParentSelector()
    })

    expect(result.current.parentSelectorOpen).toBe(true)
    expect(result.current.parentSelectorFilters).toEqual({})
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

  it('imports multiple parent records and reports aggregate success', async () => {
    const form = frm()
    form.getFieldsValue.mockReturnValue({ id: 'draft-1', sourceNos: '' })
    vi.mocked(parseParentRelationNos).mockReturnValue([])
    vi.mocked(getBusinessModuleDetail)
      .mockResolvedValueOnce({ data: { id: 'po-1', orderNo: 'PO-1' } })
      .mockResolvedValueOnce({ data: { id: 'po-2', orderNo: 'PO-2' } })
    vi.mocked(buildParentImportState)
      .mockReturnValueOnce({
        parentNosText: 'PO-1',
        shouldApplyMappedValues: false,
        mappedValues: {},
        nextItems: [{ id: 'line-1' }],
        hasImportedCurrentParent: false,
        importedItemCount: 1,
      })
      .mockReturnValueOnce({
        parentNosText: 'PO-1,PO-2',
        shouldApplyMappedValues: false,
        mappedValues: {},
        nextItems: [{ id: 'line-1' }, { id: 'line-2' }],
        hasImportedCurrentParent: false,
        importedItemCount: 2,
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
      await result.current.handleImportParentRecord([
        { id: 'po-1' },
        { id: 'po-2' },
      ])
    })

    expect(message.success).toHaveBeenCalledWith('common.importParentSuccess')
    expect(result.current.items).toEqual([{ id: 'line-1' }, { id: 'line-2' }])
  })

  it('does not count already imported parent records again', async () => {
    const form = frm()
    form.getFieldsValue.mockReturnValue({ id: 'draft-1', sourceNos: 'PO-1' })
    vi.mocked(getBusinessModuleDetail).mockResolvedValueOnce({
      data: { id: 'po-1', orderNo: 'PO-1' },
    })
    vi.mocked(buildParentImportState).mockReturnValueOnce({
      parentNosText: 'PO-1',
      shouldApplyMappedValues: false,
      mappedValues: {},
      nextItems: [{ id: 'line-1' }],
      hasImportedCurrentParent: true,
      importedItemCount: 1,
    })
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

    expect(message.success).toHaveBeenCalledWith(
      'common.importParentSuccessSimple',
    )
  })

  it('stops parent import when parent validation fails', async () => {
    const form = frm()
    form.getFieldsValue.mockReturnValue({ id: 'draft-1', sourceNos: '' })
    vi.mocked(getBusinessModuleDetail).mockResolvedValueOnce({
      data: { id: 'po-1', orderNo: 'PO-1' },
    })
    const { result } = renderWorkspace({
      form,
      config: cfg({
        parentImport: {
          parentModuleKey: 'purchase-order',
          label: '采购订单',
          parentFieldKey: 'sourceNos',
          parentDisplayFieldKey: 'orderNo',
          validateParentImport: () => '供应商不一致',
        },
      }),
    })

    await act(async () => {
      await result.current.handleImportParentRecord([{ id: 'po-1' }])
    })

    expect(message.error).toHaveBeenCalledWith('供应商不一致')
    expect(buildParentImportState).not.toHaveBeenCalled()
    expect(result.current.parentImporting).toBe(false)
  })

  it('reports parent import detail loading errors', async () => {
    vi.mocked(getBusinessModuleDetail).mockRejectedValueOnce(
      new Error('父单据不存在'),
    )
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
      await result.current.handleImportParentRecord([{ id: 'po-1' }])
    })

    expect(message.error).toHaveBeenCalledWith('父单据不存在')
    expect(result.current.parentImporting).toBe(false)
  })

  it('reports fallback parent import errors for non-error failures', async () => {
    vi.mocked(getBusinessModuleDetail).mockRejectedValueOnce('bad response')
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
      await result.current.handleImportParentRecord([{ id: 'po-1' }])
    })

    expect(message.error).toHaveBeenCalledWith('common.importParentFailed')
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

  it('syncs derived values when replacing items through setItems', () => {
    const form = frm()
    vi.mocked(syncDerivedEditorFormValuesForModule).mockReturnValue({
      quantityTotal: 3,
    })
    const { result } = renderWorkspace({
      form,
      config: cfg({
        primaryNoKey: '',
        itemColumns: [{ key: 'quantity', title: '数量' }],
      }),
    })

    act(() => {
      result.current.setItems([{ id: 'line-1', quantity: 3 }])
    })

    expect(syncDerivedEditorFormValuesForModule).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ id: 'line-1', quantity: 3 }],
      }),
    )
    expect(form.setFieldsValue).toHaveBeenCalledWith({
      quantityTotal: 3,
    })
  })

  it('calculates invoice tax fields while syncing derived form values', () => {
    const form = frm()
    form.getFieldsValue.mockReturnValue({ amount: 100 })
    mockRuntimeConfig({ defaultTaxRate: 0.13 })
    vi.mocked(syncDerivedEditorFormValuesForModule).mockReturnValue({
      amount: 100,
    })
    const { result } = renderWorkspace({
      form,
      moduleKey: 'invoice-receipt',
      config: cfg({
        primaryNoKey: '',
        formFields: [{ key: 'invoiceDate', label: '开票日期', type: 'date' }],
      }),
    })

    act(() => {
      result.current.handleFormValuesChange({ amount: 100 })
    })

    expect(form.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100,
        taxRate: 0.13,
        taxAmount: 13,
      }),
    )
  })

  it('uses runtime default tax rate and zero amount while syncing invoice tax fields', () => {
    const form = frm()
    mockRuntimeConfig({ defaultTaxRate: 0.06 })
    vi.mocked(syncDerivedEditorFormValuesForModule).mockReturnValue({})
    const { result } = renderWorkspace({
      form,
      moduleKey: 'invoice-issue',
      config: cfg({ primaryNoKey: '' }),
    })

    act(() => {
      result.current.handleFormValuesChange({ customerName: '客户A' })
    })

    expect(form.setFieldsValue).toHaveBeenCalledWith({
      taxRate: 0.06,
      taxAmount: 0,
    })
  })
})
