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
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
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

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetOptions: [{ label: '采购订单', value: 'purchase-order' }],
}))

vi.mock('@/api/print-template', () => ({
  listPrintTemplates: vi.fn(),
  savePrintTemplate: vi.fn(),
  deletePrintTemplate: vi.fn(),
}))

vi.mock('@/views/system/PrintTemplateTableCard', () => ({
  PrintTemplateTableCard: () => <div data-testid="table-card">TableCard</div>,
}))

vi.mock('@/views/system/PrintTemplateEditorModal', () => ({
  PrintTemplateEditorModal: () => <div data-testid="editor-modal">Editor</div>,
}))

vi.mock('@/views/system/PrintTemplatePreviewModal', () => ({
  PrintTemplatePreviewModal: () => (
    <div data-testid="preview-modal">Preview</div>
  ),
}))

vi.mock('@/views/system/print-template-view-utils', () => ({
  buildPrintTemplateCopyName: () => 'Copy',
}))

import { PrintTemplateView } from '@/views/system/PrintTemplateView'

describe('PrintTemplateView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockUseQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    })
  })

  it('renders without crashing', () => {
    expect(PrintTemplateView).toBeDefined()
    expect(typeof PrintTemplateView).toBe('function')
  })

  it('renders the table card', () => {
    render(<PrintTemplateView />)
    expect(screen.getByTestId('table-card')).toBeInTheDocument()
  })

  it('does not render editor modal by default', () => {
    render(<PrintTemplateView />)
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('does not render preview modal by default', () => {
    render(<PrintTemplateView />)
    expect(screen.queryByTestId('preview-modal')).not.toBeInTheDocument()
  })
})
