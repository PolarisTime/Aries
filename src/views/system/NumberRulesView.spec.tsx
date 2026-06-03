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

vi.mock('@/api/system-settings', () => ({
  listSystemSettings: vi.fn(),
  saveSystemSetting: vi.fn(),
  updateSystemUploadRule: vi.fn(),
}))

vi.mock('@/views/system/NumberRulesTableCard', () => ({
  NumberRulesTableCard: () => <div data-testid="table-card">TableCard</div>,
}))

vi.mock('@/views/system/NumberRulesEditorModal', () => ({
  NumberRulesEditorModal: () => (
    <div data-testid="editor-modal">EditorModal</div>
  ),
}))

vi.mock('@/views/system/number-rules-view-utils', () => ({
  isNumberRule: () => true,
  isUploadRule: () => false,
  matchesNumberRuleKeyword: () => true,
}))

import { NumberRulesView } from '@/views/system/NumberRulesView'

describe('NumberRulesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockUseQuery.mockReturnValue({
      data: [],
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
  })

  it('does not render editor modal by default', () => {
    render(<NumberRulesView />)
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })
})
