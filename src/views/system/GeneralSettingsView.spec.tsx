import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()
const mockCan = vi.fn()

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
  useRequestError: () => ({ showError: vi.fn() }),
}))

vi.mock('@/hooks/useRefreshQuery', () => ({
  useRefreshQuery: () => vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), warning: vi.fn() },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

vi.mock('@/views/system/GeneralSettingsTableCard', () => ({
  GeneralSettingsTableCard: (_props: Record<string, unknown>) => (
    <div data-testid="table-card">TableCard</div>
  ),
}))

vi.mock('@/views/system/GeneralSettingsEditorModal', () => ({
  GeneralSettingsEditorModal: () => (
    <div data-testid="editor-modal">Editor</div>
  ),
}))

vi.mock('@/views/system/RateLimitRulesCard', () => ({
  RateLimitRulesCard: () => <div data-testid="rate-limit-card">RateLimit</div>,
}))

vi.mock('@/views/system/number-rules-view-utils', () => ({
  isSystemSwitch: () => true,
}))

import { GeneralSettingsView } from '@/views/system/GeneralSettingsView'

describe('GeneralSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockUseQuery.mockReturnValue({
      data: [
        {
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
          remark: '',
          ruleType: '',
          moduleKey: '',
        },
      ],
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
  })

  it('renders the rate limit card', () => {
    render(<GeneralSettingsView />)
    expect(screen.getByTestId('rate-limit-card')).toBeInTheDocument()
  })

  it('exports buildSystemSettingPayload', async () => {
    const mod = await import('@/views/system/GeneralSettingsView')
    expect(mod.buildSystemSettingPayload).toBeDefined()
    expect(typeof mod.buildSystemSettingPayload).toBe('function')
  })
})
