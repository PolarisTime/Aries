import { useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@ant-design/icons', () => ({
  EyeOutlined: () => <span>EyeOutlined</span>,
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

import { PrintTemplateDropdown } from '@/views/modules/components/PrintTemplateDropdown'

function openPrintModal() {
  fireEvent.click(screen.getAllByText('modules.print.print')[0])
}

describe('PrintTemplateDropdown', () => {
  const defaultProps = {
    moduleKey: 'test-module',
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

  it('opens template modal', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)

    openPrintModal()

    expect(screen.getByTestId('print-modal')).toBeTruthy()
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
      templateType: 'HTML',
    }
    vi.mocked(useQuery).mockReturnValue({ data: [template] } as never)

    render(<PrintTemplateDropdown {...defaultProps} onPrint={onPrint} />)

    openPrintModal()
    expect(screen.getByTestId('template-select')).toHaveValue('tpl-1')
    fireEvent.click(screen.getByText('modules.print.preview'))

    openPrintModal()
    fireEvent.click(screen.getByText('modules.print.directPrint'))

    expect(onPrint).toHaveBeenCalledWith('preview', template)
    expect(onPrint).toHaveBeenCalledWith('print', template)
  })

  it('prints the selected template after switching selection', () => {
    const onPrint = vi.fn()
    const firstTemplate = {
      id: 'tpl-1',
      templateName: 'A 模板',
      targetType: 'test-module',
      templateType: 'HTML',
    }
    const secondTemplate = {
      id: 'tpl-2',
      templateName: 'B 模板',
      targetType: 'test-module',
      templateType: 'COORD',
    }
    vi.mocked(useQuery).mockReturnValue({
      data: [firstTemplate, secondTemplate],
    } as never)

    render(<PrintTemplateDropdown {...defaultProps} onPrint={onPrint} />)

    openPrintModal()
    fireEvent.change(screen.getByTestId('template-select'), {
      target: { value: 'tpl-2' },
    })
    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', secondTemplate)
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
