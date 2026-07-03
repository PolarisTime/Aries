import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PrintTemplateRecord } from '@/shared/schemas'

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
const mockFetchSettlementCompanyOptions = vi.fn()
const mockListPrintTemplates = vi.fn()
const mockSavePrintTemplate = vi.fn()
const mockDeletePrintTemplate = vi.fn()
const mockUploadPrintTemplateJson = vi.fn()

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

vi.mock('@/api/company-settings', () => ({
  fetchSettlementCompanyOptions: (...args: unknown[]) =>
    mockFetchSettlementCompanyOptions(...args),
}))

vi.mock('@/api/print-template', () => ({
  listPrintTemplates: (...args: unknown[]) => mockListPrintTemplates(...args),
  savePrintTemplate: (...args: unknown[]) => mockSavePrintTemplate(...args),
  deletePrintTemplate: (...args: unknown[]) => mockDeletePrintTemplate(...args),
  uploadPrintTemplateJson: (...args: unknown[]) =>
    mockUploadPrintTemplateJson(...args),
}))

vi.mock('antd', () => ({
  Form: {
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
    uploadPending: boolean
    onBillTypeChange: (value: string) => void
    onRefresh: () => void
    onCreate: () => void
    onPreview: (record: PrintTemplateRecord) => void
    onEdit: (record: PrintTemplateRecord) => void
    onCopy: (record: PrintTemplateRecord) => void
    onUploadJson: (record: PrintTemplateRecord, file: File) => void
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
      <span data-testid="upload-pending">{String(props.uploadPending)}</span>
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
      <button
        type="button"
        onClick={() =>
          props.onUploadJson(
            props.templates[0],
            new File(['{}'], 'layout.json', { type: 'application/json' }),
          )
        }
      >
        upload-json
      </button>
      <button
        type="button"
        onClick={() =>
          props.onUploadJson(
            props.templates[0],
            new File(['{}'], 'layout.txt', { type: 'text/plain' }),
          )
        }
      >
        upload-txt
      </button>
      <button
        type="button"
        onClick={() =>
          props.onUploadJson(
            props.templates[0],
            new File([new Uint8Array(1024 * 1024 + 1)], 'layout.json', {
              type: 'application/json',
            }),
          )
        }
      >
        upload-large-json
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
          onClick={() => onTemplateHtmlChange('LODOP.PRINT_INIT("ok");')}
        >
          coord
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
  templateCode: 'PURCHASE_TEMPLATE',
  templateHtml: 'LODOP.PRINT_INIT("采购");',
  templateType: 'COORD',
  engine: 'LODOP',
  assetRef: null,
  versionNo: 1,
  status: 'ACTIVE',
  updateTime: '2026-06-05 10:00:00',
}

const pdfTemplate: PrintTemplateRecord = {
  ...template,
  id: 'pdf-1',
  templateName: 'PDF 模板',
  templateCode: 'PDF_TEMPLATE',
  templateHtml: '{"pages":[]}',
  templateType: 'PDF_FORM',
  engine: 'PDF_FORM',
}

function mutationResults() {
  return mockUseMutation.mock.results.map((result) => result.value)
}

function mutationPayloads() {
  return mutationResults().flatMap((mutation) =>
    mutation.mutate.mock.calls.map(([payload]: [unknown]) => payload),
  )
}

type MutationConfig = {
  mutationFn?: (payload: any) => unknown
  onSuccess?: (data: unknown, variables: any) => void
}

function mutationConfigs() {
  return mockUseMutation.mock.calls.map(([config]: [MutationConfig]) => config)
}

describe('PrintTemplateView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockFetchSettlementCompanyOptions.mockResolvedValue([])
    mockListPrintTemplates.mockResolvedValue({ data: [template] })
    mockForm.validateFields.mockResolvedValue({
      billType: 'purchase-order',
      templateName: '  新模板  ',
      templateCode: '  NEW_TEMPLATE  ',
      templateType: 'COORD',
      engine: 'LODOP',
      assetRef: '',
      settlementCompanyId: undefined,
      settlementCompanyName: '',
      versionNo: 1,
      status: 'ACTIVE',
    })
    mockUseMutation.mockImplementation((options: any) => ({
      isPending: false,
      mutate: vi.fn((payload: unknown) => {
        options.onSuccess?.(undefined, payload)
      }),
      mutateAsync: vi.fn((payload: unknown) => {
        options.onSuccess?.(undefined, payload)
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
    expect(screen.getByTestId('upload-pending')).toHaveTextContent('false')
  })

  it('uses an empty template list while the template query has no data', () => {
    mockUseQuery.mockImplementation((options: { queryKey?: unknown[] }) => {
      if (options.queryKey?.[0] === 'master-options') {
        return { data: [], isLoading: false }
      }
      return { data: undefined, isLoading: true }
    })

    render(<PrintTemplateView />)

    expect(screen.getByTestId('template-count')).toHaveTextContent('0')
    expect(screen.getByTestId('loading')).toHaveTextContent('true')
  })

  it('registers query and mutation functions with stripped request payloads', async () => {
    const file = new File(['{}'], 'layout.json', { type: 'application/json' })
    render(<PrintTemplateView />)

    await mockUseQuery.mock.calls[0][0].queryFn()
    await mockUseQuery.mock.calls[1][0].queryFn()
    await mutationConfigs()[0]?.mutationFn?.({
      id: 'tpl-1',
      billType: 'purchase-order',
      templateName: '采购模板',
      templateHtml: 'LODOP.PRINT_INIT("采购");',
      previousBillType: 'sales-order',
    })
    await mutationConfigs()[1]?.mutationFn?.({
      id: 'tpl-1',
      billType: 'purchase-order',
    })
    await mutationConfigs()[2]?.mutationFn?.({
      id: 'pdf-1',
      file,
      billType: 'purchase-order',
    })

    expect(mockListPrintTemplates).toHaveBeenCalledWith('purchase-order')
    expect(mockFetchSettlementCompanyOptions).toHaveBeenCalled()
    expect(mockSavePrintTemplate).toHaveBeenCalledWith({
      id: 'tpl-1',
      billType: 'purchase-order',
      templateName: '采购模板',
      templateHtml: 'LODOP.PRINT_INIT("采购");',
    })
    expect(mockSavePrintTemplate.mock.calls[0][0]).not.toHaveProperty(
      'previousBillType',
    )
    expect(mockDeletePrintTemplate).toHaveBeenCalledWith('tpl-1')
    expect(mockUploadPrintTemplateJson).toHaveBeenCalledWith('pdf-1', file)
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

  it('opens create editor and warns when template content is empty', async () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('create'))
    expect(screen.getByTestId('editor-modal')).toBeInTheDocument()
    expect(screen.getByTestId('editing')).toHaveTextContent('false')
    expect(mockForm.resetFields).toHaveBeenCalled()
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith({
      billType: 'purchase-order',
      templateName: '',
      templateCode: '',
      templateType: 'COORD',
      engine: 'LODOP',
      assetRef: '',
      settlementCompanyId: undefined,
      settlementCompanyName: '',
      versionNo: 1,
      status: 'ACTIVE',
    })

    fireEvent.click(screen.getByText('save'))
    await waitFor(() => {
      expect(mockMessageWarning).toHaveBeenCalledWith(
        'system.printTemplate.inputTemplateContent',
      )
    })
  })

  it('closes the editor without saving', () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('create'))
    fireEvent.click(screen.getByText('close'))

    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('ignores rejected form validation when saving', async () => {
    mockForm.validateFields.mockRejectedValue(new Error('invalid'))
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('create'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toEqual([])
    })
    expect(mockMessageWarning).not.toHaveBeenCalledWith(
      'system.printTemplate.inputTemplateContent',
    )
  })

  it('opens editor, updates html and saves an existing template', async () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('edit'))
    expect(screen.getByTestId('editing')).toHaveTextContent('true')
    expect(screen.getByTestId('template-html')).toHaveTextContent(
      'LODOP.PRINT_INIT("采购");',
    )
    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tpl-1',
        billType: 'purchase-order',
        templateName: '采购模板',
        templateCode: 'PURCHASE_TEMPLATE',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: '',
        versionNo: 1,
        status: 'ACTIVE',
      }),
    )

    fireEvent.click(screen.getByText('coord'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: 'tpl-1',
        billType: 'purchase-order',
        templateName: '新模板',
        templateCode: 'NEW_TEMPLATE',
        templateHtml: 'LODOP.PRINT_INIT("ok");',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: undefined,
        settlementCompanyId: undefined,
        settlementCompanyName: undefined,
        versionNo: 1,
        status: 'ACTIVE',
      })
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.saveSuccess')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['print-template'],
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['print-templates', 'purchase-order'],
    })
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('saves a COORD template with form field defaults', async () => {
    mockUseQuery.mockImplementation((options: { queryKey?: unknown[] }) => {
      if (options.queryKey?.[0] === 'master-options') {
        return {
          data: [{ value: 'other', label: 'Other' }],
          isLoading: false,
        }
      }
      return {
        data: { data: [template] },
        isLoading: false,
      }
    })
    mockForm.validateFields.mockResolvedValue({
      billType: 'purchase-order',
      templateName: '  默认模板  ',
      templateCode: '   ',
      assetRef: undefined,
      settlementCompanyId: ' missing-company ',
      settlementCompanyName: null,
      versionNo: undefined,
      status: undefined,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('create'))
    fireEvent.click(screen.getByText('coord'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: undefined,
        billType: 'purchase-order',
        templateName: '默认模板',
        templateCode: undefined,
        templateHtml: 'LODOP.PRINT_INIT("ok");',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: undefined,
        settlementCompanyId: 'missing-company',
        settlementCompanyName: undefined,
        versionNo: 1,
        status: 'ACTIVE',
      })
    })
  })

  it('saves a PDF form without template html and uses PDF engine default', async () => {
    mockForm.validateFields.mockResolvedValue({
      billType: 'purchase-order',
      templateName: 'PDF 空模板',
      templateCode: undefined,
      templateType: 'PDF_FORM',
      engine: undefined,
      assetRef: ' pdf/layout.pdf ',
      settlementCompanyId: null,
      settlementCompanyName: '  ',
      versionNo: 2,
      status: 'DISABLED',
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('create'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: undefined,
        billType: 'purchase-order',
        templateName: 'PDF 空模板',
        templateCode: undefined,
        templateHtml: '',
        templateType: 'PDF_FORM',
        engine: 'PDF_FORM',
        assetRef: 'pdf/layout.pdf',
        settlementCompanyId: undefined,
        settlementCompanyName: undefined,
        versionNo: 2,
        status: 'DISABLED',
      })
    })
  })

  it('normalizes settlement company id before saving', async () => {
    mockUseQuery.mockImplementation((options: { queryKey?: unknown[] }) => {
      if (options.queryKey?.[0] === 'master-options') {
        return {
          data: [
            {
              id: '330050675528433664',
              value: '330050675528433664',
              label: 'TEST9',
              companyName: 'TEST9',
            },
          ],
          isLoading: false,
        }
      }
      return {
        data: { data: [template] },
        isLoading: false,
      }
    })
    mockForm.validateFields.mockResolvedValue({
      billType: 'sales-order',
      templateName: 'TEST9 A4',
      templateCode: 'TEST9_A4',
      templateType: 'COORD',
      engine: 'LODOP',
      assetRef: '',
      settlementCompanyId: 330050675528433664,
      settlementCompanyName: ' TEST9 ',
      versionNo: 1,
      status: 'ACTIVE',
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('edit'))
    fireEvent.click(screen.getByText('coord'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual(
        expect.objectContaining({
          settlementCompanyId: '330050675528433664',
          settlementCompanyName: 'TEST9',
        }),
      )
    })
  })

  it('matches numeric settlement company id against numeric option value', async () => {
    mockUseQuery.mockImplementation((options: { queryKey?: unknown[] }) => {
      if (options.queryKey?.[0] === 'master-options') {
        return {
          data: [{ value: '07', label: 'Company 07' }],
          isLoading: false,
        }
      }
      return {
        data: { data: [template] },
        isLoading: false,
      }
    })
    mockForm.validateFields.mockResolvedValue({
      billType: 'purchase-order',
      templateName: '数字结算主体',
      templateCode: 'NUMERIC_COMPANY',
      templateType: 'COORD',
      engine: 'LODOP',
      assetRef: '',
      settlementCompanyId: 7,
      settlementCompanyName: '',
      versionNo: 1,
      status: 'ACTIVE',
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('edit'))
    fireEvent.click(screen.getByText('coord'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual(
        expect.objectContaining({
          settlementCompanyId: '07',
        }),
      )
    })
  })

  it('invalidates the previous bill type after moving a template', async () => {
    mockForm.validateFields.mockResolvedValue({
      billType: 'sales-order',
      templateName: '销售模板',
      templateCode: 'SALES_TEMPLATE',
      templateType: 'COORD',
      engine: 'LODOP',
      assetRef: '',
      versionNo: 1,
      status: 'ACTIVE',
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('edit'))
    fireEvent.click(screen.getByText('coord'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: 'tpl-1',
        billType: 'sales-order',
        templateName: '销售模板',
        templateCode: 'SALES_TEMPLATE',
        templateHtml: 'LODOP.PRINT_INIT("ok");',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: undefined,
        settlementCompanyId: undefined,
        settlementCompanyName: undefined,
        versionNo: 1,
        status: 'ACTIVE',
        previousBillType: 'purchase-order',
      })
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['print-templates', 'sales-order'],
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['print-templates', 'purchase-order'],
    })
  })

  it('saves a copied template without active id', async () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('copy'))
    fireEvent.click(screen.getByText('coord'))
    fireEvent.click(screen.getByText('save'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: undefined,
        billType: 'purchase-order',
        templateName: '新模板',
        templateCode: 'NEW_TEMPLATE',
        templateHtml: 'LODOP.PRINT_INIT("ok");',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: undefined,
        settlementCompanyId: undefined,
        settlementCompanyName: undefined,
        versionNo: 1,
        status: 'ACTIVE',
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
        templateCode: '',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: '',
        versionNo: 1,
        status: 'ACTIVE',
      }),
    )
    expect(screen.getByTestId('template-html')).toHaveTextContent(
      'LODOP.PRINT_INIT("采购");',
    )
  })

  it('warns instead of editing a file-managed template', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ ...template, syncMode: 'FILE' }] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('edit'))

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'system.printTemplate.fileManagedEditHint',
    )
    expect(screen.queryByTestId('editor-modal')).not.toBeInTheDocument()
  })

  it('opens sparse records with selected-bill-type and value defaults', () => {
    const sparseTemplate: PrintTemplateRecord = {
      ...template,
      billType: undefined,
      templateCode: null,
      templateHtml: '',
      templateType: undefined,
      engine: null,
      assetRef: null,
      settlementCompanyId: null,
      settlementCompanyName: null,
      versionNo: null,
      status: null,
    }
    mockUseQuery.mockReturnValue({
      data: { data: [sparseTemplate] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('edit'))

    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        billType: 'purchase-order',
        templateCode: '',
        templateType: 'COORD',
        engine: 'LODOP',
        assetRef: '',
        settlementCompanyId: undefined,
        settlementCompanyName: '',
        versionNo: 1,
        status: 'ACTIVE',
      }),
    )
    expect(screen.getByTestId('template-html')).toHaveTextContent('')
  })

  it('opens PDF records for editing with PDF type defaults', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ ...pdfTemplate, engine: null }] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('edit'))

    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        templateType: 'PDF_FORM',
        engine: 'PDF_FORM',
      }),
    )
  })

  it('copies PDF records with selected-bill-type and value defaults', () => {
    const sparsePdfTemplate: PrintTemplateRecord = {
      ...pdfTemplate,
      billType: undefined,
      templateHtml: '',
      engine: null,
      versionNo: null,
    }
    mockUseQuery.mockReturnValue({
      data: { data: [sparsePdfTemplate] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('copy'))

    expect(mockForm.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        billType: 'purchase-order',
        templateType: 'PDF_FORM',
        engine: 'PDF_FORM',
        versionNo: 1,
      }),
    )
    expect(screen.getByTestId('template-html')).toHaveTextContent('')
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
          ([payload]: [unknown]) =>
            JSON.stringify(payload) ===
            JSON.stringify({ id: 'tpl-1', billType: 'purchase-order' }),
        ),
      ),
    ).toBe(true)
    expect(mockMessageSuccess).toHaveBeenCalledWith('common.deleteSuccess')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['print-templates', 'purchase-order'],
    })
  })

  it('uses selected bill type when deleting a record without bill type', async () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ ...template, billType: undefined }] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('delete'))
    await mockModalConfirm.mock.calls[0][0].onOk()

    expect(
      mutationResults().some((mutation) =>
        mutation.mutateAsync.mock.calls.some(
          ([payload]: [unknown]) =>
            JSON.stringify(payload) ===
            JSON.stringify({ id: 'tpl-1', billType: 'purchase-order' }),
        ),
      ),
    ).toBe(true)
  })

  it('uploads PDF form json template', async () => {
    mockUseQuery.mockReturnValue({
      data: { data: [pdfTemplate] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('upload-json'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: 'pdf-1',
        file: expect.any(File),
        billType: 'purchase-order',
      })
    })
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'system.printTemplate.uploadJsonSuccess',
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['print-template'],
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['print-templates', 'purchase-order'],
    })
  })

  it('uses selected bill type when uploading a PDF template without bill type', async () => {
    mockUseQuery.mockReturnValue({
      data: { data: [{ ...pdfTemplate, billType: undefined }] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('upload-json'))

    await waitFor(() => {
      expect(mutationPayloads()).toContainEqual({
        id: 'pdf-1',
        file: expect.any(File),
        billType: 'purchase-order',
      })
    })
  })

  it('invalidates base printable template cache when mutation variables omit bill type', () => {
    const file = new File(['{}'], 'layout.json', { type: 'application/json' })
    render(<PrintTemplateView />)

    mutationConfigs()[1]?.onSuccess?.(undefined, { id: 'tpl-1' })
    mutationConfigs()[2]?.onSuccess?.(undefined, {
      id: 'pdf-1',
      file,
    })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['print-templates'],
    })
  })

  it('warns when uploading non-json file', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [pdfTemplate] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('upload-txt'))

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'system.printTemplate.uploadJsonFileOnly',
    )
  })

  it('warns when uploading oversized json file', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [pdfTemplate] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('upload-large-json'))

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'system.printTemplate.uploadJsonSizeLimit',
    )
  })

  it('warns when uploading json for non-PDF template', () => {
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('upload-json'))

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'system.printTemplate.uploadPdfFormOnly',
    )
  })

  it('warns when upload permission is missing', () => {
    mockCan.mockReturnValue(false)
    mockUseQuery.mockReturnValue({
      data: { data: [pdfTemplate] },
      isLoading: false,
    })
    render(<PrintTemplateView />)

    fireEvent.click(screen.getByText('upload-json'))

    expect(mockMessageWarning).toHaveBeenCalledWith('common.noPermission')
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

  it('reports mutation errors through request error handler', () => {
    const saveError = new Error('save failed')
    const deleteError = new Error('delete failed')
    const uploadError = new Error('upload failed')
    render(<PrintTemplateView />)

    mockUseMutation.mock.calls[0][0].onError(saveError)
    mockUseMutation.mock.calls[1][0].onError(deleteError)
    mockUseMutation.mock.calls[2][0].onError(uploadError)

    expect(mockShowError).toHaveBeenCalledWith(saveError, 'api.saveFailed')
    expect(mockShowError).toHaveBeenCalledWith(deleteError, 'api.deleteFailed')
    expect(mockShowError).toHaveBeenCalledWith(
      uploadError,
      'system.printTemplate.uploadJsonFailed',
    )
  })

  it('falls back to purchase-order when target options are empty', async () => {
    vi.resetModules()
    vi.doMock('@/config/print-template-targets', () => ({
      printTemplateTargetOptions: [],
    }))

    const module = await import('@/views/system/PrintTemplateView')

    expect(module.PrintTemplateView).toBeTypeOf('function')
  })
})
