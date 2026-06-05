import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PrintTemplateRecord } from '@/types/print-template'

const mockUseQuery = vi.fn()
const mockCan = vi.fn()
const mockUseMutation = vi.fn()
const mockInvalidateQueries = vi.fn()
const mockForm = {
  resetFields: vi.fn(),
  setFieldsValue: vi.fn(),
  validateFields: vi.fn(),
}
const mockRefresh = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMessageWarning = vi.fn()
const mockModalConfirm = vi.fn()
const mockSavePrintTemplate = vi.fn()
const mockDeletePrintTemplate = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
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
  modal: { confirm: (...args: unknown[]) => mockModalConfirm(...args) },
}))

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetOptions: [{ label: '采购订单', value: 'purchase-order' }],
}))

vi.mock('@/api/print-template', () => ({
  listPrintTemplates: vi.fn(),
  savePrintTemplate: (...args: unknown[]) => mockSavePrintTemplate(...args),
  deletePrintTemplate: (...args: unknown[]) => mockDeletePrintTemplate(...args),
}))

vi.mock('antd/es/form', () => ({
  default: {
    useForm: () => [mockForm],
  },
}))

vi.mock('@/views/system/PrintTemplateTableCard', () => ({
  PrintTemplateTableCard: (props: {
    selectedBillType: string
    activeTemplateId?: string
    templates: PrintTemplateRecord[]
    loading: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    onBillTypeChange: (value: string) => void
    onRefresh: () => void
    onCreate: () => void
    onPreview: (record: PrintTemplateRecord) => void
    onEdit: (record: PrintTemplateRecord) => void
    onCopy: (record: PrintTemplateRecord) => void
    onDelete: (record: PrintTemplateRecord) => void
    onActiveChange: (id: string) => void
  }) => (
    <div data-testid="table-card">
      <span data-testid="selected-bill-type">{props.selectedBillType}</span>
      <span data-testid="active-template-id">
        {props.activeTemplateId ?? 'none'}
      </span>
      <span data-testid="template-count">{props.templates.length}</span>
      <span data-testid="loading">{String(props.loading)}</span>
      <span data-testid="can-create">{String(props.canCreate)}</span>
      <span data-testid="can-edit">{String(props.canEdit)}</span>
      <span data-testid="can-delete">{String(props.canDelete)}</span>
      <button
        type="button"
        onClick={() => props.onBillTypeChange('sales-order')}
      >
        bill-type
      </button>
      <button type="button" onClick={props.onRefresh}>
        refresh
      </button>
      <button type="button" onClick={props.onCreate}>
        create
      </button>
      <button type="button" onClick={() => props.onPreview(props.templates[0])}>
        preview
      </button>
      <button type="button" onClick={() => props.onEdit(props.templates[0])}>
        edit
      </button>
      <button type="button" onClick={() => props.onCopy(props.templates[0])}>
        copy
      </button>
      <button type="button" onClick={() => props.onDelete(props.templates[0])}>
        delete
      </button>
      <button
        type="button"
        onClick={() => props.onActiveChange(props.templates[0]?.id ?? 'tpl-1')}
      >
        active
      </button>
    </div>
  ),
}))

vi.mock('@/views/system/PrintTemplateEditorModal', () => ({
  PrintTemplateEditorModal: ({
    open,
    editing,
    templateHtml,
    saving,
    onTemplateHtmlChange,
    onSave,
    onClose,
  }: {
    open: boolean
    editing: boolean
    templateHtml: string
    saving: boolean
    onTemplateHtmlChange: (value: string) => void
    onSave: () => void
    onClose: () => void
  }) =>
    open ? (
      <div data-testid="editor-modal">
        <span data-testid="editing">{String(editing)}</span>
        <span data-testid="saving">{String(saving)}</span>
        <span data-testid="template-html">{templateHtml}</span>
        <button
          type="button"
          onClick={() => onTemplateHtmlChange('<div>ok</div>')}
        >
          html
        </button>
        <button type="button" onClick={onSave}>
          save
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

vi.mock('@/views/system/PrintTemplatePreviewModal', () => ({
  PrintTemplatePreviewModal: ({
    open,
    template,
    onClose,
  }: {
    open: boolean
    template: PrintTemplateRecord | null
    onClose: () => void
  }) =>
    open ? (
      <div data-testid="preview-modal">
        <span data-testid="preview-template">{template?.templateName}</span>
        <button type="button" onClick={onClose}>
          close-preview
        </button>
      </div>
    ) : null,
}))

vi.mock('@/views/system/print-template-view-utils', () => ({
  buildPrintTemplateCopyName: () => 'Copy',
}))

import { PrintTemplateView } from '@/views/system/PrintTemplateView'

const template: PrintTemplateRecord = {
  id: 'tpl-1',
  billType: 'purchase-order',
  templateName: '采购模板',
  templateHtml: '<div>采购</div>',
  templateType: 'HTML',
  updateTime: '2026-06-05 10:00:00',
}

function mutationResults() {
  return mockUseMutation.mock.results.map((result) => result.value)
}

function mutationPayloads() {
  return mutationResults().flatMap((mutation) =>
    mutation.mutate.mock.calls.map(([payload]: [unknown]) => payload),
  )
}

describe('PrintTemplateView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockForm.validateFields.mockResolvedValue({
      billType: 'purchase-order',
      templateName: '  新模板  ',
      templateType: 'HTML',
    })
    mockUseMutation.mockImplementation((options: any) => ({
      isPending: false,
      mutate: vi.fn((payload: unknown) => {
        options.onSuccess?.(payload)
      }),
      mutateAsync: vi.fn((payload: unknown) => {
        options.onSuccess?.(payload)
        return Promise.resolve(payload)
      }),
    }))
    mockUseQuery.mockReturnValue({
      data: { data: [template] },
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
    expect(screen.getByTestId('selected-bill-type')).toHaveTextContent(
      'purchase-order',
    )
    expect(screen.getByTestId('template-count')).toHaveTextContent('1')
    expect(screen.getByTestId('can-create')).toHaveTextContent('true')
    expect(screen.getByTestId('can-edit')).toHaveTextContent('true')
    expect(screen.getByTestId('can-delete')).toHaveTextContent('true')
  })

  it('does not render editor modal by default', () => {
    render(<PrintTemplateView />)
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('does not render preview modal by default', () => {
    render(<PrintTemplateView />)
    expect(screen.queryByTestId('preview-modal')).not.toBeInTheDocument()
  })

  it('changes bill type, refreshes and marks active template', () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('bill-type'))
    expect(screen.getByTestId('selected-bill-type')).toHaveTextContent(
      'sales-order',
    )

    fireEvent.click(screen.getByText('active'))
    expect(screen.getByTestId('active-template-id')).toHaveTextContent('tpl-1')

    fireEvent.click(screen.getByText('refresh'))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('opens create editor and warns when template content is empty', () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('create'))
    expect(screen.getByTestId('editor-modal')).toBeInTheDocument()
    expect(screen.getByTestId('editing')).toHaveTextContent('false')
    expect(mockForm.resetFields).toHaveBeenCalled()
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith({
      billType: 'purchase-order',
      templateName: '',
      templateType: 'HTML',
    })

    fireEvent.click(screen.getByText('save'))
    expect(mockMessageWarning).toHaveBeenCalledWith(
      'system.printTemplate.inputTemplateContent',
    )
  })

  it('opens editor, updates html and saves an existing template', async () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('edit'))
    expect(screen.getByTestId('editing')).toHaveTextContent('true')
    expect(screen.getByTestId('template-html')).toHaveTextContent(
      '<div>采购</div>',
    )
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tpl-1',
        billType: 'purchase-order',
        templateName: '采购模板',
        templateType: 'HTML',
      }),
    )

    fireEvent.click(screen.getByText('html'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: 'tpl-1',
        billType: 'purchase-order',
        templateName: '新模板',
        templateHtml: '<div>ok</div>',
        templateType: 'HTML',
      })
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.saveSuccess')
    expect(mockInvalidateQueries).toHaveBeenCalled()
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('saves a copied template without active id', async () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('copy'))
    fireEvent.click(screen.getByText('html'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: undefined,
        billType: 'purchase-order',
        templateName: '新模板',
        templateHtml: '<div>ok</div>',
        templateType: 'HTML',
      })
    })
  })

  it('copies template as a new template', () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('copy'))

    expect(screen.getByTestId('editing')).toHaveTextContent('false')
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        billType: 'purchase-order',
        templateName: 'Copy',
        templateType: 'HTML',
      }),
    )
    expect(screen.getByTestId('template-html')).toHaveTextContent(
      '<div>采购</div>',
    )
  })

  it('opens and closes preview modal', () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('preview'))
    expect(screen.getByTestId('preview-template')).toHaveTextContent('采购模板')

    fireEvent.click(screen.getByText('close-preview'))
    expect(screen.queryByTestId('preview-modal')).not.toBeInTheDocument()
  })

  it('confirms deletion and runs delete mutation', async () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('delete'))
    expect(mockModalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'system.printTemplate.deleteTemplate',
        okButtonProps: { danger: true },
      }),
    )

    await mockModalConfirm.mock.calls[0][0].onOk()
    expect(
      mutationResults().some((mutation) =>
        mutation.mutateAsync.mock.calls.some(
          ([templateId]: [unknown]) => templateId === 'tpl-1',
        ),
      ),
    ).toBe(true)
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.deleteSuccess')
  })

  it('warns when create, edit, copy or delete permission is missing', () => {
    mockCan.mockReturnValue(false)
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('create'))
    fireEvent.click(screen.getByText('edit'))
    fireEvent.click(screen.getByText('copy'))
    fireEvent.click(screen.getByText('delete'))

    expect(mockMessageWarning).toHaveBeenCalledTimes(4)
    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('reports save and delete errors through request error handler', () => {
    const saveError = new Error('save failed')
    const deleteError = new Error('delete failed')
    render(<PrintTemplateView />)

    mockUseMutation.mock.calls[0][0].onError(saveError)
    mockUseMutation.mock.calls[1][0].onError(deleteError)

    expect(mockShowError).toHaveBeenCalledWith(saveError, 'api.saveFailed')
    expect(mockShowError).toHaveBeenCalledWith(deleteError, 'api.deleteFailed')
  })
})
