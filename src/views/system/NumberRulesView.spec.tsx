import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'

const mockUseQuery = vi.fn()
const mockCan = vi.fn()
const mockForm = {
  setFieldsValue: vi.fn(),
  validateFields: vi.fn(),
}
const mockRefresh = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockListSystemSettings = vi.fn()
const mockSaveSystemSetting = vi.fn()
const mockUpdateSystemUploadRule = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/hooks/useRefreshQuery', () => ({
  useRefreshQuery: () => mockRefresh,
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
    warning: (...args: unknown[]) => mockMessageWarning(...args),
  },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

vi.mock('antd', () => ({
  Form: {
    useForm: () => [mockForm],
  },
}))

vi.mock('@/api/system-settings', () => ({
  listSystemSettings: (...args: unknown[]) => mockListSystemSettings(...args),
  saveSystemSetting: (...args: unknown[]) => mockSaveSystemSetting(...args),
  updateSystemUploadRule: (...args: unknown[]) =>
    mockUpdateSystemUploadRule(...args),
}))

vi.mock('@/views/system/NumberRulesTableCard', () => ({
  NumberRulesTableCard: (props: {
    keyword: string
    statusFilter?: string
    rows: ModuleRecord[]
    numberRuleRows: ModuleRecord[]
    uploadRuleRows: ModuleRecord[]
    loading: boolean
    canEdit: boolean
    onKeywordChange: (value: string) => void
    onStatusFilterChange: (value?: string) => void
    onRefresh: () => void
    onEditNumberRule: (record: ModuleRecord) => void
    onEditUploadRule: (record: ModuleRecord) => void
  }) => (
    <div data-testid="table-card">
      <span data-testid="keyword">{props.keyword}</span>
      <span data-testid="status-filter">{props.statusFilter ?? 'all'}</span>
      <span data-testid="rows-count">{props.rows.length}</span>
      <span data-testid="number-rule-count">{props.numberRuleRows.length}</span>
      <span data-testid="upload-rule-count">{props.uploadRuleRows.length}</span>
      <span data-testid="loading">{String(props.loading)}</span>
      <span data-testid="can-edit">{String(props.canEdit)}</span>
      <button type="button" onClick={() => props.onKeywordChange('销售')}>
        keyword
      </button>
      <button type="button" onClick={() => props.onStatusFilterChange('禁用')}>
        status
      </button>
      <button type="button" onClick={() => props.onStatusFilterChange()}>
        clear-status
      </button>
      <button type="button" onClick={props.onRefresh}>
        refresh
      </button>
      <button
        type="button"
        onClick={() => props.onEditNumberRule(props.numberRuleRows[0])}
      >
        edit-number
      </button>
      <button
        type="button"
        onClick={() => props.onEditUploadRule(props.uploadRuleRows[0])}
      >
        edit-upload
      </button>
    </div>
  ),
}))

vi.mock('@/views/system/NumberRulesEditorModal', () => ({
  NumberRulesEditorModal: ({
    open,
    kind,
    saving,
    onSave,
    onClose,
  }: {
    open: boolean
    kind: string
    saving: boolean
    onSave: () => void
    onClose: () => void
  }) =>
    open ? (
      <div data-testid="editor-modal">
        <span data-testid="editor-kind">{kind}</span>
        <span data-testid="saving">{String(saving)}</span>
        <button type="button" onClick={onSave}>
          save
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

const mockForceEditorOpen = vi.fn(() => false)
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useReducer: <S, A>(
      reducer: (state: S, action: A) => S,
      initialState: S,
    ) => {
      const [state, dispatch] = actual.useReducer(reducer, initialState)
      return [
        mockForceEditorOpen() ? { ...state, editorOpen: true } : state,
        dispatch,
      ]
    },
  }
})

import { NumberRulesView } from '@/views/system/NumberRulesView'

const purchaseNumberRule: ModuleRecord = {
  id: 'nr-1',
  settingCode: 'PURCHASE_ORDER_NO',
  settingName: '采购订单编号',
  billName: '采购订单',
  prefix: 'PO',
  dateRule: 'yyyyMM',
  serialLength: 5,
  resetRule: 'MONTHLY',
  sampleNo: 'PO20260600001',
  status: '正常',
  remark: '采购编号',
  ruleType: '',
  moduleKey: '',
}

const salesNumberRule: ModuleRecord = {
  id: 'nr-2',
  settingCode: 'SALES_ORDER_NO',
  settingName: '销售订单编号',
  billName: '销售订单',
  prefix: '',
  dateRule: '',
  serialLength: 0,
  resetRule: '',
  sampleNo: 'SO20260600001',
  status: '禁用',
  remark: '销售编号',
  ruleType: '',
  moduleKey: '',
}

const uploadRule: ModuleRecord = {
  id: 'up-1',
  settingCode: 'ATTACHMENT_RENAME_RULE',
  settingName: '附件命名',
  billName: '销售订单',
  prefix: '{yyyyMMdd}-{originName}{ext}',
  dateRule: '',
  serialLength: 0,
  resetRule: '',
  sampleNo: '20260605-contract.pdf',
  status: '正常',
  remark: '上传命名',
  ruleType: 'UPLOAD_RULE',
  moduleKey: 'sales-order',
  moduleName: '销售订单',
  ruleCode: 'sales-order-upload',
  ruleName: '销售订单附件',
  renamePattern: '{yyyyMMdd}-{originName}{ext}',
}

describe('NumberRulesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockForceEditorOpen.mockReturnValue(false)
    mockCan.mockReturnValue(true)
    mockListSystemSettings.mockResolvedValue([
      purchaseNumberRule,
      salesNumberRule,
      uploadRule,
    ])
    mockSaveSystemSetting.mockResolvedValue(undefined)
    mockUpdateSystemUploadRule.mockResolvedValue(undefined)
    mockForm.validateFields.mockResolvedValue({
      settingCode: purchaseNumberRule.settingCode,
      settingName: purchaseNumberRule.settingName,
      billName: purchaseNumberRule.billName,
      prefix: 'PO',
      dateRule: 'yyyyMM',
      serialLength: 6,
      resetRule: 'MONTHLY',
      status: '正常',
      remark: '已更新',
    })
    mockUseQuery.mockReturnValue({
      data: [purchaseNumberRule, salesNumberRule, uploadRule],
      isLoading: false,
    })
  })

  it('renders without crashing', () => {
    expect(NumberRulesView).toBeDefined()
    expect(typeof NumberRulesView).toBe('function')
  })

  it('renders the table card', () => {
    render(<NumberRulesView />)
    expect(screen.getByTestId('table-card')).toBeInTheDocument()
    expect(screen.getByTestId('rows-count')).toHaveTextContent('3')
    expect(screen.getByTestId('number-rule-count')).toHaveTextContent('2')
    expect(screen.getByTestId('upload-rule-count')).toHaveTextContent('1')
    expect(screen.getByTestId('can-edit')).toHaveTextContent('true')
  })

  it('defaults rows to an empty list when query data is missing', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true })

    render(<NumberRulesView />)

    expect(screen.getByTestId('rows-count')).toHaveTextContent('0')
    expect(screen.getByTestId('number-rule-count')).toHaveTextContent('0')
    expect(screen.getByTestId('upload-rule-count')).toHaveTextContent('0')
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
  })

  it('configures number rules query function', async () => {
    render(<NumberRulesView />)

    const queryOptions = mockUseQuery.mock.calls[0][0]
    await expect(queryOptions.queryFn()).resolves.toEqual([
      purchaseNumberRule,
      salesNumberRule,
      uploadRule,
    ])
    expect(mockListSystemSettings).toHaveBeenCalledTimes(1)
  })

  it('does not render editor modal by default', () => {
    render(<NumberRulesView />)
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('ignores save when no record is being edited', () => {
    mockForceEditorOpen.mockReturnValue(true)

    render(<NumberRulesView />)
    fireEvent.click(screen.getByText('save'))

    expect(mockForm.validateFields).not.toHaveBeenCalled()
    expect(mockSaveSystemSetting).not.toHaveBeenCalled()
    expect(mockUpdateSystemUploadRule).not.toHaveBeenCalled()
  })

  it('updates filters and refreshes from table callbacks', () => {
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('keyword'))
    expect(screen.getByTestId('keyword')).toHaveTextContent('销售')
    expect(screen.getByTestId('rows-count')).toHaveTextContent('3')
    expect(screen.getByTestId('number-rule-count')).toHaveTextContent('1')
    expect(screen.getByTestId('upload-rule-count')).toHaveTextContent('1')

    fireEvent.click(screen.getByText('status'))
    expect(screen.getByTestId('status-filter')).toHaveTextContent('禁用')
    expect(screen.getByTestId('number-rule-count')).toHaveTextContent('1')
    expect(screen.getByTestId('upload-rule-count')).toHaveTextContent('0')

    fireEvent.click(screen.getByText('clear-status'))
    expect(screen.getByTestId('status-filter')).toHaveTextContent('all')
    fireEvent.click(screen.getByText('refresh'))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('opens number rule editor and seeds defaulted form values', () => {
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-number'))

    expect(screen.getByTestId('editor-modal')).toBeInTheDocument()
    expect(screen.getByTestId('editor-kind')).toHaveTextContent('number-rule')
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        settingCode: 'PURCHASE_ORDER_NO',
        prefix: 'PO',
        dateRule: 'yyyyMM',
        serialLength: 5,
        resetRule: 'MONTHLY',
      }),
    )
  })

  it('warns when opening editor without permission', () => {
    mockCan.mockReturnValue(false)
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-number'))

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'system.numberRules.noEditPermission',
    )
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('warns when opening upload editor without permission', () => {
    mockCan.mockReturnValue(false)
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-upload'))

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'system.numberRules.noEditPermission',
    )
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('uses default form values for sparse number and upload rules', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          ...purchaseNumberRule,
          prefix: '',
          dateRule: '',
          serialLength: 0,
          resetRule: '',
          status: '',
          remark: '',
        },
        {
          ...uploadRule,
          moduleName: '',
          ruleCode: '',
          ruleName: '',
          renamePattern: '',
          prefix: '',
          status: '',
          remark: '',
        },
      ],
      isLoading: false,
    })
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-number'))
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: '',
        dateRule: 'yyyy',
        serialLength: 6,
        resetRule: 'YEARLY',
        status: '正常',
        remark: '',
      }),
    )
    fireEvent.click(screen.getByText('close'))

    fireEvent.click(screen.getByText('edit-upload'))
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleName: '销售订单',
        ruleCode: 'ATTACHMENT_RENAME_RULE',
        ruleName: '附件命名',
        renamePattern: '',
        status: '正常',
        remark: '',
      }),
    )
  })

  it('saves number rules and refreshes list', async () => {
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-number'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mockSaveSystemSetting).toHaveBeenCalledWith({
        id: 'nr-1',
        settingCode: 'PURCHASE_ORDER_NO',
        settingName: '采购订单编号',
        billName: '采购订单',
        prefix: 'PO',
        dateRule: 'yyyyMM',
        serialLength: 6,
        resetRule: 'MONTHLY',
        status: '正常',
        remark: '已更新',
      })
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.saveSuccess')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('closes the editor without saving', () => {
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-number'))
    fireEvent.click(screen.getByText('close'))

    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
    expect(mockSaveSystemSetting).not.toHaveBeenCalled()
  })

  it('opens upload rule editor and saves upload rule payload', async () => {
    mockForm.validateFields.mockResolvedValueOnce({
      renamePattern: '{yyyyMMdd}-{originName}{ext}',
      status: '禁用',
      remark: '禁用上传命名',
    })
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-upload'))
    expect(screen.getByTestId('editor-kind')).toHaveTextContent('upload-rule')
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleKey: 'sales-order',
        moduleName: '销售订单',
        ruleCode: 'sales-order-upload',
        renamePattern: '{yyyyMMdd}-{originName}{ext}',
      }),
    )

    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mockUpdateSystemUploadRule).toHaveBeenCalledWith({
        renamePattern: '{yyyyMMdd}-{originName}{ext}',
        status: '禁用',
        remark: '禁用上传命名',
      })
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.saveSuccess')
  })

  it('reports save failures through request error handler', async () => {
    const error = new Error('save failed')
    mockForm.validateFields.mockRejectedValueOnce(error)
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-number'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        error,
        'system.numberRules.saveFailed',
      )
    })
  })

  it('reports API save failures and resets saving state', async () => {
    const error = new Error('api failed')
    mockSaveSystemSetting.mockRejectedValueOnce(error)
    render(<NumberRulesView />)

    fireEvent.click(screen.getByText('edit-number'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        error,
        'system.numberRules.saveFailed',
      )
    })
    expect(screen.getByTestId('saving')).toHaveTextContent('false')
  })
})
