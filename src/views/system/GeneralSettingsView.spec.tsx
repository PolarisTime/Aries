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
const mockSaveSystemSetting = vi.fn()

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

vi.mock('antd/es/form', () => ({
  default: {
    useForm: () => [mockForm],
  },
}))

vi.mock('@/api/system-settings', () => ({
  listSystemSettings: vi.fn(),
  saveSystemSetting: (...args: unknown[]) => mockSaveSystemSetting(...args),
}))

vi.mock('@/views/system/GeneralSettingsTableCard', () => ({
  GeneralSettingsTableCard: (props: {
    keyword: string
    statusFilter?: string
    filteredRows: ModuleRecord[]
    basicSettingRows: ModuleRecord[]
    switchRows: ModuleRecord[]
    canEdit: boolean
    loading: boolean
    toggling: boolean
    onKeywordChange: (value: string) => void
    onStatusFilterChange: (value?: string) => void
    onRefresh: () => void
    onEdit: (record: ModuleRecord) => void
    onToggle: (record: ModuleRecord) => void
  }) => (
    <div data-testid="table-card">
      <span data-testid="keyword">{props.keyword}</span>
      <span data-testid="status-filter">{props.statusFilter ?? 'all'}</span>
      <span data-testid="filtered-count">{props.filteredRows.length}</span>
      <span data-testid="basic-count">{props.basicSettingRows.length}</span>
      <span data-testid="switch-count">{props.switchRows.length}</span>
      <span data-testid="can-edit">{String(props.canEdit)}</span>
      <span data-testid="loading">{String(props.loading)}</span>
      <span data-testid="toggling">{String(props.toggling)}</span>
      <button type="button" onClick={() => props.onKeywordChange('登录')}>
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
        onClick={() => props.onEdit(props.basicSettingRows[0])}
      >
        edit-basic
      </button>
      <button type="button" onClick={() => props.onEdit(props.switchRows[0])}>
        edit-switch
      </button>
      <button
        type="button"
        onClick={() =>
          props.onEdit(
            props.switchRows.find(
              (row) =>
                row.settingCode === 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS',
            ) ?? props.switchRows[0],
          )
        }
      >
        edit-operation-log
      </button>
      <button type="button" onClick={() => props.onToggle(props.switchRows[0])}>
        toggle-switch
      </button>
    </div>
  ),
}))

vi.mock('@/views/system/GeneralSettingsEditorModal', () => ({
  GeneralSettingsEditorModal: ({
    open,
    record,
    saving,
    onSave,
    onClose,
  }: {
    open: boolean
    record: ModuleRecord | null
    saving: boolean
    onSave: () => void
    onClose: () => void
  }) =>
    open ? (
      <div data-testid="editor-modal">
        <span data-testid="editing-code">{record?.settingCode}</span>
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

vi.mock('@/views/system/RateLimitRulesCard', () => ({
  RateLimitRulesCard: () => <div data-testid="rate-limit-card">RateLimit</div>,
}))

vi.mock('@/views/system/number-rules-view-utils', () => ({
  isSystemSwitch: () => true,
}))

import { GeneralSettingsView } from '@/views/system/GeneralSettingsView'

const taxRateRecord: ModuleRecord = {
  id: '1',
  settingCode: 'SYS_DEFAULT_TAX_RATE',
  settingName: '默认税率',
  billName: '',
  prefix: '',
  dateRule: '',
  serialLength: 0,
  resetRule: '',
  sampleNo: '0.13',
  status: '正常',
  remark: '税率配置',
  ruleType: '',
  moduleKey: '',
}

const loginCaptchaRecord: ModuleRecord = {
  id: '2',
  settingCode: 'SYS_LOGIN_CAPTCHA',
  settingName: '登录验证码',
  billName: '',
  prefix: '',
  dateRule: '',
  serialLength: 0,
  resetRule: '',
  sampleNo: '',
  status: '正常',
  remark: '登录安全',
  ruleType: '',
  moduleKey: '',
}

const operationLogRecord: ModuleRecord = {
  id: '3',
  settingCode: 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS',
  settingName: '操作日志详细动作',
  billName: '',
  prefix: '',
  dateRule: '',
  serialLength: 0,
  resetRule: '',
  sampleNo: 'QUERY,DETAIL',
  status: '正常',
  remark: '日志配置',
  ruleType: '',
  moduleKey: '',
}

describe('GeneralSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockSaveSystemSetting.mockResolvedValue(undefined)
    mockForm.validateFields.mockResolvedValue({
      settingCode: taxRateRecord.settingCode,
      settingName: taxRateRecord.settingName,
      billName: taxRateRecord.billName,
      remark: taxRateRecord.remark,
      enabled: true,
      numericValue: 0.16,
      selectedActions: [],
    })
    mockUseQuery.mockReturnValue({
      data: [taxRateRecord, loginCaptchaRecord, operationLogRecord],
      isLoading: false,
    })
  })

  it('renders without crashing', () => {
    expect(GeneralSettingsView).toBeDefined()
    expect(typeof GeneralSettingsView).toBe('function')
  })

  it('renders the table card', () => {
    render(<GeneralSettingsView />)
    expect(screen.getByTestId('table-card')).toBeInTheDocument()
    expect(screen.getByTestId('basic-count')).toHaveTextContent('1')
    expect(screen.getByTestId('switch-count')).toHaveTextContent('2')
    expect(screen.getByTestId('can-edit')).toHaveTextContent('true')
  })

  it('renders the rate limit card', () => {
    render(<GeneralSettingsView />)
    expect(screen.getByTestId('rate-limit-card')).toBeInTheDocument()
  })

  it('builds system setting payload', async () => {
    const mod = await import('@/views/system/general-settings-view-utils')
    expect(mod.buildSystemSettingPayload).toBeDefined()
    expect(typeof mod.buildSystemSettingPayload).toBe('function')
    expect(
      mod.buildSystemSettingPayload(
        { ...taxRateRecord, prefix: '', dateRule: '', resetRule: '' },
        { sampleNo: '0.2' },
      ),
    ).toEqual(
      expect.objectContaining({
        prefix: 'SYS',
        dateRule: 'NONE',
        serialLength: 1,
        resetRule: 'NEVER',
        sampleNo: '0.2',
      }),
    )
  })

  it('updates filters and refreshes from table callbacks', () => {
    render(<GeneralSettingsView />)

    fireEvent.click(screen.getByText('keyword'))
    expect(screen.getByTestId('keyword')).toHaveTextContent('登录')
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('1')

    fireEvent.click(screen.getByText('status'))
    expect(screen.getByTestId('status-filter')).toHaveTextContent('禁用')
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('0')

    fireEvent.click(screen.getByText('clear-status'))
    expect(screen.getByTestId('status-filter')).toHaveTextContent('all')
    fireEvent.click(screen.getByText('refresh'))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('opens editor and seeds numeric form values when editing is allowed', () => {
    render(<GeneralSettingsView />)

    fireEvent.click(screen.getByText('edit-basic'))

    expect(screen.getByTestId('editor-modal')).toBeInTheDocument()
    expect(screen.getByTestId('editing-code')).toHaveTextContent(
      'SYS_DEFAULT_TAX_RATE',
    )
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        numericValue: 0.13,
        settingCode: 'SYS_DEFAULT_TAX_RATE',
      }),
    )
  })

  it('warns and keeps editor closed when editing without permission', () => {
    mockCan.mockReturnValue(false)
    render(<GeneralSettingsView />)

    fireEvent.click(screen.getByText('edit-basic'))

    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('toggles switch settings and refreshes on success', async () => {
    render(<GeneralSettingsView />)

    fireEvent.click(screen.getByText('toggle-switch'))

    await waitFor(() => {
      expect(mockSaveSystemSetting).toHaveBeenCalledWith(
        expect.objectContaining({
          id: loginCaptchaRecord.id,
          settingCode: 'SYS_LOGIN_CAPTCHA',
          sampleNo: 'ON',
          status: '禁用',
        }),
      )
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'system.generalSettings.closed',
    )
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('reports toggle failures through request error handler', async () => {
    const error = new Error('save failed')
    mockSaveSystemSetting.mockRejectedValueOnce(error)
    render(<GeneralSettingsView />)

    fireEvent.click(screen.getByText('toggle-switch'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(error, 'table.operationFailed')
    })
  })

  it('saves numeric settings with validated form values', async () => {
    render(<GeneralSettingsView />)
    fireEvent.click(screen.getByText('edit-basic'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mockSaveSystemSetting).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taxRateRecord.id,
          settingCode: 'SYS_DEFAULT_TAX_RATE',
          settingName: taxRateRecord.settingName,
          sampleNo: '0.16',
          status: '正常',
        }),
      )
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.saveSuccess')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('requires selected actions for detailed operation log setting', async () => {
    mockForm.validateFields.mockResolvedValueOnce({
      settingCode: operationLogRecord.settingCode,
      settingName: operationLogRecord.settingName,
      billName: operationLogRecord.billName,
      remark: operationLogRecord.remark,
      enabled: true,
      selectedActions: [],
    })
    render(<GeneralSettingsView />)

    fireEvent.click(screen.getByText('edit-operation-log'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mockMessageWarning).toHaveBeenCalledWith(
        'system.generalSettingsEditor.selectActionRequired',
      )
    })
    expect(mockSaveSystemSetting).not.toHaveBeenCalled()
  })

  it('saves toggle settings with selected action values', async () => {
    mockForm.validateFields.mockResolvedValueOnce({
      settingCode: operationLogRecord.settingCode,
      settingName: operationLogRecord.settingName,
      billName: operationLogRecord.billName,
      remark: operationLogRecord.remark,
      enabled: false,
      selectedActions: ['QUERY', 'DETAIL'],
    })
    render(<GeneralSettingsView />)

    fireEvent.click(screen.getByText('edit-operation-log'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mockSaveSystemSetting).toHaveBeenCalledWith(
        expect.objectContaining({
          id: operationLogRecord.id,
          settingCode: 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS',
          sampleNo: 'QUERY,DETAIL',
          status: '禁用',
        }),
      )
    })
  })

  it('reports save failures through request error handler', async () => {
    const error = new Error('validate failed')
    mockForm.validateFields.mockRejectedValueOnce(error)
    render(<GeneralSettingsView />)

    fireEvent.click(screen.getByText('edit-basic'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(error, 'api.saveFailed')
    })
  })
})
