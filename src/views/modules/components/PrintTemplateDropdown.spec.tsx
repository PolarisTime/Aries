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
  useQuery: vi.fn().mockReturnValue({ data: [] }),
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

import { PrintTemplateDropdown } from '@/views/modules/components/PrintTemplateDropdown'

const EMPTY_QUERY_DATA: unknown[] = []

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

  it('renders empty state when templates are empty', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)

    openPrintModal()

    expect(screen.getByText('modules.print.noTemplate')).toBeTruthy()
    expect(screen.getByTestId('empty')).toBeTruthy()
  })

  it('prints selected template in preview and direct modes', () => {
    const onPrint = vi.fn()
    const template = {
      id: 'tpl-1',
      templateName: '出库单模板',
      targetType: 'test-module',
      templateType: 'COORD',
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
    }
    const secondTemplate = {
      id: 'tpl-2',
      templateName: 'B 模板',
      targetType: 'test-module',
      templateType: 'COORD',
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

  it('passes print options without closing the modal', () => {
    const onPrint = vi.fn()
    const template = {
      id: 'tpl-1',
      templateName: 'A 模板',
      targetType: 'test-module',
      templateType: 'COORD',
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
})
