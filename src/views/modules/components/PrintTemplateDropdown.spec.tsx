import { useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { messageWarningMock } = vi.hoisted(() => ({
  messageWarningMock: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(),
  useQuery: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('antd', () => ({
  Button: ({ children, icon, loading: _loading, ...props }: any) => (
    <button {...props}>
      {icon}
      {children}
    </button>
  ),
  Checkbox: ({ checked, children, onChange }: any) => (
    <label>
      <input
        checked={checked}
        onChange={(event) => onChange(event)}
        type="checkbox"
      />
      {children}
    </label>
  ),
  Empty: ({ description }: any) => <div data-testid="empty">{description}</div>,
  Modal: ({ children, open, title }: any) =>
    open ? (
      <div data-testid="print-modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Select: ({ onChange, options = [], value }: any) => (
    <select
      data-testid="template-select"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.value}
        </option>
      ))}
    </select>
  ),
  Space: ({ children }: any) => <div data-testid="space">{children}</div>,
  Tag: ({ children }: any) => <span data-testid="tag">{children}</span>,
  Typography: {
    Text: ({ children }: any) => <span>{children}</span>,
  },
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, icon, loading: _loading, ...props }: any) => (
    <button {...props}>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('antd/es/checkbox', () => ({
  default: ({ checked, children, onChange }: any) => (
    <label>
      <input
        checked={checked}
        onChange={(event) => onChange(event)}
        type="checkbox"
      />
      {children}
    </label>
  ),
}))

vi.mock('antd/es/empty', () => ({
  default: ({ description }: any) => (
    <div data-testid="empty">{description}</div>
  ),
}))

vi.mock('antd/es/modal', () => ({
  default: ({ children, open, title }: any) =>
    open ? (
      <div data-testid="print-modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}))

vi.mock('antd/es/select', () => ({
  default: ({ onChange, options = [], value }: any) => (
    <select
      data-testid="template-select"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.value}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('antd/es/space', () => ({
  default: ({ children }: any) => <div data-testid="space">{children}</div>,
}))

vi.mock('antd/es/tag', () => ({
  default: ({ children }: any) => <span data-testid="tag">{children}</span>,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children }: any) => <span>{children}</span>,
  },
}))

vi.mock('@ant-design/icons', () => ({
  DownloadOutlined: () => <span>DownloadOutlined</span>,
  EyeOutlined: () => <span>EyeOutlined</span>,
  FileExcelOutlined: () => <span>FileExcelOutlined</span>,
  HolderOutlined: () => <span>HolderOutlined</span>,
  PrinterOutlined: () => <span>PrinterOutlined</span>,
}))

vi.mock('@/api/print-template', () => ({
  listPrintTemplates: vi.fn(),
}))

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetMap: {
    'test-module': 'test-target',
  },
}))

vi.mock('@/utils/antd-app', () => ({
  message: { warning: messageWarningMock },
}))

import { listPrintTemplates } from '@/api/print-template'
import { PrintTemplateDropdown } from '@/views/modules/components/PrintTemplateDropdown'

const EMPTY_QUERY_DATA: unknown[] = []

function printableTemplateQueryOptions(moduleKey = 'test-module') {
  const calls = vi.mocked(useQuery).mock.calls
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const options = calls[index]?.[0] as
      | { queryFn?: () => Promise<unknown>; queryKey?: readonly unknown[] }
      | undefined
    if (
      Array.isArray(options?.queryKey) &&
      options.queryKey[0] === 'print-templates' &&
      options.queryKey[1] === moduleKey
    ) {
      return options
    }
  }
  return undefined
}

function mockPrintableTemplates(templates: unknown[]) {
  vi.mocked(useQuery).mockImplementation(((options: {
    queryKey?: readonly unknown[]
  }) => ({
    data:
      Array.isArray(options.queryKey) &&
      options.queryKey[0] === 'print-templates'
        ? templates
        : EMPTY_QUERY_DATA,
  })) as never)
}

function openPrintModal() {
  fireEvent.click(screen.getAllByText('modules.print.print')[0])
}

describe('PrintTemplateDropdown', () => {
  const defaultProps = {
    moduleKey: 'test-module',
    moduleTitle: '测试模块',
    selectedCount: 1,
    selectedRowKeys: ['row-1'],
    selectedRows: [{ id: 'row-1', orderNo: 'SO-001', customerName: '客户甲' }],
    disabled: false,
    loading: false,
    onPrint: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQuery).mockReturnValue({ data: [] } as never)
  })

  it('renders print button', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)
    expect(screen.getAllByText('modules.print.print')[0]).toBeTruthy()
  })

  it('opens print job modal', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)

    openPrintModal()

    expect(screen.getByTestId('print-modal')).toBeTruthy()
    expect(screen.getByText('modules.print.jobTitle')).toBeTruthy()
    expect(screen.getByText('测试模块')).toBeTruthy()
  })

  it('uses configured print template target as fallback module title', () => {
    render(<PrintTemplateDropdown {...defaultProps} moduleTitle={undefined} />)

    openPrintModal()

    expect(screen.getByText('test-target')).toBeTruthy()
  })

  it('renders empty state when templates are empty', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)

    openPrintModal()

    expect(screen.getByText('modules.print.noTemplate')).toBeTruthy()
    expect(screen.getByTestId('empty')).toBeTruthy()
  })

  it('closes print job modal from footer action', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)

    openPrintModal()
    fireEvent.click(screen.getByText('common.cancel'))

    expect(screen.queryByTestId('print-modal')).toBeNull()
  })

  it('prints selected template in preview and direct modes', () => {
    const onPrint = vi.fn()
    const template = {
      id: 'tpl-1',
      templateName: '出库单模板',
      targetType: 'test-module',
      templateType: 'COORD',
      templateHtml: 'LODOP.PRINT_INIT("test");',
    }
    mockPrintableTemplates([template])

    render(<PrintTemplateDropdown {...defaultProps} onPrint={onPrint} />)

    openPrintModal()
    expect(screen.getByTestId('template-select')).toHaveValue('tpl-1')
    fireEvent.click(screen.getByText('modules.print.preview'))

    openPrintModal()
    fireEvent.click(screen.getByText('modules.print.directPrint'))

    expect(onPrint).toHaveBeenCalledWith('preview', template, {
      hideUnitPrice: false,
      hideRemark: false,
    })
    expect(onPrint).toHaveBeenCalledWith('print', template, {
      hideUnitPrice: false,
      hideRemark: false,
    })
    expect(screen.getByTestId('print-modal')).toBeTruthy()
  })

  it('prints the selected template after switching selection', () => {
    const onPrint = vi.fn()
    const firstTemplate = {
      id: 'tpl-1',
      templateName: 'A 模板',
      targetType: 'test-module',
      templateType: 'COORD',
      templateHtml: 'LODOP.PRINT_INIT("test");',
    }
    const secondTemplate = {
      id: 'tpl-2',
      templateName: 'B 模板',
      targetType: 'test-module',
      templateType: 'COORD',
      templateHtml: 'LODOP.PRINT_INIT("test");',
    }
    mockPrintableTemplates([firstTemplate, secondTemplate])

    render(<PrintTemplateDropdown {...defaultProps} onPrint={onPrint} />)

    openPrintModal()
    fireEvent.change(screen.getByTestId('template-select'), {
      target: { value: 'tpl-2' },
    })
    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', secondTemplate, {
      hideUnitPrice: false,
      hideRemark: false,
    })
  })

  it('keeps active pdf form templates without template html', () => {
    const pdfTemplate = {
      id: 'tpl-pdf',
      templateName: 'PDF 模板',
      targetType: 'test-module',
      templateType: 'PDF_FORM',
      status: 'ACTIVE',
    }
    mockPrintableTemplates([
      {
        id: 'tpl-disabled',
        templateName: '停用模板',
        targetType: 'test-module',
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
        status: 'DISABLED',
      },
      pdfTemplate,
    ])

    render(<PrintTemplateDropdown {...defaultProps} />)

    openPrintModal()

    expect(screen.getByTestId('template-select')).toHaveValue('tpl-pdf')
    expect(screen.queryByText('tpl-disabled')).toBeNull()
  })

  it('only shows templates matching the selected settlement company', () => {
    const test9Template = {
      id: 'tpl-test9',
      templateName: 'TEST9 模板',
      targetType: 'test-module',
      templateType: 'COORD',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      settlementCompanyId: '9',
      settlementCompanyName: 'TEST9',
    }
    mockPrintableTemplates([
      {
        id: 'tpl-yingjie',
        templateName: '颖捷模板',
        targetType: 'test-module',
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
        settlementCompanyId: '7',
        settlementCompanyName: '嘉兴颖捷建材有限公司',
      },
      test9Template,
    ])

    render(
      <PrintTemplateDropdown
        {...defaultProps}
        selectedRows={[
          {
            id: 'row-1',
            orderNo: 'SO-001',
            settlementCompanyId: '9',
            settlementCompanyName: 'TEST9',
          },
        ]}
      />,
    )

    openPrintModal()

    expect(screen.getByTestId('template-select')).toHaveValue('tpl-test9')
    expect(screen.queryByText('tpl-yingjie')).toBeNull()
  })

  it('shows no template state when settlement company has no matching template', () => {
    mockPrintableTemplates([
      {
        id: 'tpl-yingjie',
        templateName: '颖捷模板',
        targetType: 'test-module',
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
        settlementCompanyId: '7',
        settlementCompanyName: '嘉兴颖捷建材有限公司',
      },
    ])

    render(
      <PrintTemplateDropdown
        {...defaultProps}
        selectedRows={[
          {
            id: 'row-1',
            orderNo: 'SO-001',
            settlementCompanyId: '9',
            settlementCompanyName: 'TEST9',
          },
        ]}
      />,
    )

    openPrintModal()

    expect(screen.getByText('modules.print.noTemplate')).toBeTruthy()
    expect(screen.getByTestId('empty')).toBeTruthy()
  })

  it('passes print options without closing the modal', () => {
    const onPrint = vi.fn()
    const template = {
      id: 'tpl-1',
      templateName: 'A 模板',
      targetType: 'test-module',
      templateType: 'COORD',
      templateHtml: 'LODOP.PRINT_INIT("test");',
    }
    mockPrintableTemplates([template])

    render(<PrintTemplateDropdown {...defaultProps} onPrint={onPrint} />)

    openPrintModal()
    fireEvent.click(screen.getByLabelText('modules.print.hideUnitPrice'))
    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', template, {
      hideUnitPrice: true,
      hideRemark: false,
    })
    expect(screen.getByTestId('print-modal')).toBeTruthy()
  })

  it('passes sales order xlsx export callback to print modal', () => {
    const onExportPrintXlsx = vi.fn()

    render(
      <PrintTemplateDropdown
        {...defaultProps}
        moduleKey="sales-order"
        onExportPrintXlsx={onExportPrintXlsx}
      />,
    )

    openPrintModal()
    fireEvent.click(screen.getByText('modules.print.exportXlsx'))

    expect(onExportPrintXlsx).toHaveBeenCalledWith({
      hideUnitPrice: false,
      hideRemark: false,
    })
  })

  it('does not open modal when multiple records are selected', () => {
    const onPrint = vi.fn()

    render(
      <PrintTemplateDropdown
        {...defaultProps}
        onPrint={onPrint}
        selectedCount={2}
        selectedRowKeys={['row-1', 'row-2']}
      />,
    )

    openPrintModal()

    expect(screen.queryByTestId('print-modal')).toBeNull()
    expect(onPrint).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.singleRecordOnly',
    )
  })

  it('disables query for unsupported module key', () => {
    render(
      <PrintTemplateDropdown
        {...defaultProps}
        moduleKey="unsupported-module"
      />,
    )

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['print-templates', 'unsupported-module'],
      }),
    )
  })

  it('loads printable templates from query function response data', async () => {
    const templates = [
      {
        id: 'tpl-1',
        templateName: 'A 模板',
        targetType: 'test-module',
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
      },
    ]
    vi.mocked(listPrintTemplates).mockResolvedValue({
      data: templates,
    } as never)

    render(<PrintTemplateDropdown {...defaultProps} />)

    await expect(printableTemplateQueryOptions()?.queryFn?.()).resolves.toBe(
      templates,
    )
    expect(listPrintTemplates).toHaveBeenCalledWith('test-module')
  })

  it('returns empty templates when query response data is not an array', async () => {
    vi.mocked(listPrintTemplates).mockResolvedValue({ data: null } as never)

    render(<PrintTemplateDropdown {...defaultProps} />)

    await expect(printableTemplateQueryOptions()?.queryFn?.()).resolves.toEqual(
      [],
    )
  })
})
