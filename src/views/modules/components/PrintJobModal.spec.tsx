import { useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintJobModal } from '@/views/modules/components/PrintJobModal'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.count == null ? key : `${key}:${params.count}`,
  }),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, icon, ...props }: any) => (
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

vi.mock('antd/es/input', () => ({
  default: ({ disabled, onChange, placeholder, value }: any) => (
    <input
      aria-label={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event)}
      value={value}
    />
  ),
}))

vi.mock('antd/es/modal', () => ({
  default: ({ children, open, title }: any) =>
    open ? (
      <div data-testid="print-job-modal">
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
  default: ({ children }: any) => <span>{children}</span>,
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
  PrinterOutlined: () => <span>PrinterOutlined</span>,
}))

vi.mock('@/api/print-template', () => ({
  listPrintRecordBrands: vi.fn(),
  listPrintRecordItems: vi.fn(),
}))

const coordTemplate = {
  id: 'tpl-coord',
  templateName: '坐标模板',
  templateHtml: 'LODOP.PRINT_INIT("test");',
  templateType: 'COORD' as const,
}

const pdfTemplate = {
  id: 'tpl-pdf',
  templateName: 'PDF模板',
  templateHtml: '{"fields":{}}',
  templateType: 'PDF_FORM' as const,
}

describe('PrintJobModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQuery).mockReturnValue({ data: [] } as never)
  })

  it('renders selected records and triggers preview', () => {
    const onPrint = vi.fn()
    const onClose = vi.fn()

    render(
      <PrintJobModal
        moduleTitle="销售订单"
        onClose={onClose}
        onPrint={onPrint}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1', orderNo: 'SO-001', customerName: '客户甲' }]}
        templates={[coordTemplate]}
      />,
    )

    expect(screen.getByText('modules.print.jobTitle')).toBeTruthy()
    expect(screen.getByText('销售订单')).toBeTruthy()
    expect(screen.getByText('SO-001 / 客户甲')).toBeTruthy()

    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', coordTemplate, {
      hideUnitPrice: false,
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('passes hide unit price option', () => {
    const onPrint = vi.fn()

    render(
      <PrintJobModal
        onClose={vi.fn()}
        onPrint={onPrint}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1', orderNo: 'SO-001' }]}
        templates={[coordTemplate]}
      />,
    )

    fireEvent.click(screen.getByLabelText('modules.print.hideUnitPrice'))
    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', coordTemplate, {
      hideUnitPrice: true,
    })
  })

  it('shows print item details without enabling brand override', () => {
    const onPrint = vi.fn()
    vi.mocked(useQuery).mockReturnValue({
      data: [
        {
          id: 'item-1',
          recordId: '1',
          brand: '抚顺新钢',
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 'Ф18',
          quantity: '12',
          pieceWeightTon: '0.123',
          weightTon: '1.476',
          unitPrice: '3300.00',
          amount: '4870.80',
        },
      ],
    } as never)

    render(
      <PrintJobModal
        onClose={vi.fn()}
        onPrint={onPrint}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1', orderNo: 'SO-001' }]}
        templates={[coordTemplate]}
      />,
    )

    expect(screen.getByText('抚顺新钢')).toBeTruthy()
    expect(screen.getByText('螺纹钢')).toBeTruthy()
    expect(screen.getByText('HRB400E')).toBeTruthy()
    expect(screen.getByText('Ф18')).toBeTruthy()
    expect(
      screen.queryByLabelText('modules.print.brandOverridePlaceholder'),
    ).toBeNull()
  })

  it('passes item-level brand override option', () => {
    const onPrint = vi.fn()
    vi.mocked(useQuery).mockReturnValue({
      data: [
        {
          id: 'item-1',
          recordId: '1',
          brand: '抚顺新钢',
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 'Ф18',
          quantity: '12',
          pieceWeightTon: '0.123',
          weightTon: '1.476',
          unitPrice: '3300.00',
          amount: '4870.80',
        },
        {
          id: 'item-2',
          recordId: '1',
          brand: '抚顺新钢',
          category: '盘螺',
          material: 'HRB400E',
          spec: 'Ф8',
          quantity: '4',
          pieceWeightTon: '-',
          weightTon: '2.000',
          unitPrice: '3200.00',
          amount: '6400.00',
        },
      ],
    } as never)

    render(
      <PrintJobModal
        onClose={vi.fn()}
        onPrint={onPrint}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1', orderNo: 'SO-001' }]}
        templates={[coordTemplate]}
      />,
    )

    fireEvent.click(screen.getByLabelText('modules.print.enableBrandOverride'))
    expect(screen.getAllByText('抚顺新钢')).toHaveLength(2)
    fireEvent.change(
      screen.getAllByLabelText('modules.print.brandOverridePlaceholder')[0],
      {
        target: { value: '抚新' },
      },
    )
    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', coordTemplate, {
      hideUnitPrice: false,
      brandOverridesByItemId: {
        'item-1': '抚新',
      },
    })
  })

  it('keeps original brands when mapping inputs are blank', () => {
    const onPrint = vi.fn()
    vi.mocked(useQuery).mockReturnValue({
      data: [
        {
          id: 'item-1',
          recordId: '1',
          brand: '抚顺新钢',
          category: '',
          material: '',
          spec: '',
          quantity: '',
          pieceWeightTon: '',
          weightTon: '',
          unitPrice: '',
          amount: '',
        },
      ],
    } as never)

    render(
      <PrintJobModal
        onClose={vi.fn()}
        onPrint={onPrint}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1', orderNo: 'SO-001' }]}
        templates={[coordTemplate]}
      />,
    )

    fireEvent.click(screen.getByLabelText('modules.print.enableBrandOverride'))
    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', coordTemplate, {
      hideUnitPrice: false,
    })
  })

  it('switches template before direct print', () => {
    const onPrint = vi.fn()

    render(
      <PrintJobModal
        onClose={vi.fn()}
        onPrint={onPrint}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1', orderNo: 'SO-001' }]}
        templates={[coordTemplate, pdfTemplate]}
      />,
    )

    fireEvent.change(screen.getByTestId('template-select'), {
      target: { value: 'tpl-pdf' },
    })
    fireEvent.click(screen.getByText('modules.print.directPrint'))

    expect(onPrint).toHaveBeenCalledWith('print', pdfTemplate, {
      hideUnitPrice: false,
    })
  })

  it('shows download button for PDF templates', () => {
    const onPrint = vi.fn()

    render(
      <PrintJobModal
        onClose={vi.fn()}
        onPrint={onPrint}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1' }]}
        templates={[pdfTemplate]}
      />,
    )

    fireEvent.click(screen.getByText('modules.print.downloadPdf'))

    expect(onPrint).toHaveBeenCalledWith('download', pdfTemplate, {
      hideUnitPrice: false,
    })
  })

  it('shows empty template state', () => {
    render(
      <PrintJobModal
        onClose={vi.fn()}
        onPrint={vi.fn()}
        open
        moduleKey="sales-order"
        selectedCount={0}
        selectedRowKeys={[]}
        selectedRows={[]}
        templates={[]}
      />,
    )

    expect(screen.getByTestId('empty')).toBeTruthy()
    expect(screen.getByText('modules.print.noTemplate')).toBeTruthy()
    expect(screen.getByText('modules.print.onlySelectedIds')).toBeTruthy()
  })
})
