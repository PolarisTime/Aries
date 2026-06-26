import { useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PrintJobModal,
  reorderPrintItemIds,
} from '@/views/modules/components/PrintJobModal'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'system.printTemplateEditor.templateTypeCoord': '坐标套打',
        'system.printTemplateEditor.templateTypePdfForm': 'PDF 表单',
      }
      const text = map[key] ?? key
      return params?.count == null ? text : `${text}:${params.count}`
    },
  }),
}))

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children }: any) => <div>{children}</div>,
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn().mockReturnValue(undefined),
    },
  },
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
  default: ({ className, disabled, onChange, placeholder, value }: any) => (
    <input
      aria-label={placeholder}
      className={className}
      disabled={disabled}
      onChange={(event) => onChange(event)}
      value={value}
    />
  ),
}))

vi.mock('antd/es/modal', () => ({
  default: ({ children, open, title, width }: any) =>
    open ? (
      <div data-testid="print-job-modal" data-width={width}>
        <h2 data-testid="print-job-title">{title}</h2>
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
          {option.label}
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
    Text: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
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
  listPrintRecordBrands: vi.fn(),
  listPrintRecordItems: vi.fn(),
}))

vi.mock('@/constants/module-options', () => ({
  getCustomerProjectOptions: vi.fn(() => []),
}))

import { getCustomerProjectOptions } from '@/constants/module-options'

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
    vi.mocked(getCustomerProjectOptions).mockReturnValue([])
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

    expect(screen.getByTestId('print-job-title')).toHaveTextContent(
      'modules.print.jobTitle',
    )
    expect(screen.getByTestId('print-job-modal')).toHaveAttribute(
      'data-width',
      '92vw',
    )
    expect(screen.getByText('销售订单')).toBeTruthy()
    expect(screen.getByText('SO-001 / 客户甲')).toBeTruthy()
    expect(screen.queryByText('modules.print.selectedRecords:1')).toBeNull()
    expect(screen.queryByText('modules.print.selectedRecordList')).toBeNull()
    expect(screen.getAllByText('坐标套打').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', coordTemplate, {
      hideUnitPrice: false,
      hideRemark: false,
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows selected project summary in modal header', () => {
    render(
      <PrintJobModal
        moduleTitle="销售订单"
        onClose={vi.fn()}
        onPrint={vi.fn()}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[
          {
            id: '1',
            orderNo: 'SO-001',
            customerName: '客户甲',
            projectNameAbbr: '绿建',
            projectName: '浙江大东吴杭萧绿建科技有限公司',
          },
        ]}
        templates={[coordTemplate]}
      />,
    )

    const summary = screen.getByText(
      'SO-001 / 客户甲 / 绿建（浙江大东吴杭萧绿建科技有限公司）',
    )
    expect(summary).toBeTruthy()
    expect(summary).not.toHaveClass('truncate')
    expect(summary).toHaveAttribute(
      'title',
      'SO-001 / 客户甲 / 绿建（浙江大东吴杭萧绿建科技有限公司）',
    )
    expect(screen.queryByText(/modules\.print\.project：/)).toBeNull()
  })

  it('fills project abbreviation from customer project options', () => {
    vi.mocked(getCustomerProjectOptions).mockReturnValue([
      {
        value: '浙江大东吴杭萧绿建科技有限公司',
        label: '绿建（浙江大东吴杭萧绿建科技有限公司）',
        customerName: '客户甲',
        projectName: '浙江大东吴杭萧绿建科技有限公司',
        projectNameAbbr: '绿建',
      },
    ])

    render(
      <PrintJobModal
        moduleTitle="销售订单"
        onClose={vi.fn()}
        onPrint={vi.fn()}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[
          {
            id: '1',
            orderNo: 'SO-001',
            customerName: '客户甲',
            projectName: '浙江大东吴杭萧绿建科技有限公司',
          },
        ]}
        templates={[coordTemplate]}
      />,
    )

    expect(getCustomerProjectOptions).toHaveBeenCalledWith({
      customerName: '客户甲',
    })
    expect(
      screen.getByText(
        'SO-001 / 客户甲 / 绿建（浙江大东吴杭萧绿建科技有限公司）',
      ),
    ).toBeTruthy()
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
      hideRemark: false,
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
        selectedRows={[
          {
            id: '1',
            orderNo: 'SO-001',
            remark: '急送',
            totalWeight: '1.476',
          },
        ]}
        templates={[coordTemplate]}
      />,
    )

    expect(screen.getByText('抚顺新钢')).toBeTruthy()
    expect(screen.getByText('modules.print.recordRemark：')).toBeTruthy()
    expect(screen.getByText('急送')).toBeTruthy()
    expect(screen.getByText('modules.print.totalQuantity：')).toBeTruthy()
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getByText('modules.print.totalWeight：')).toBeTruthy()
    expect(screen.getAllByText('1.476').length).toBeGreaterThan(0)
    expect(screen.getByText('modules.print.itemBrand')).toBeTruthy()
    expect(screen.getByText('modules.print.itemCategory')).toBeTruthy()
    expect(screen.queryByText('modules.print.itemCategory：')).toBeNull()
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
    expect(
      screen.getAllByLabelText('modules.print.brandOverridePlaceholder')[0],
    ).toHaveClass('h-8')
    expect(
      screen.getAllByLabelText('modules.print.brandOverridePlaceholder')[0],
    ).toHaveClass('w-[120px]')
    fireEvent.change(
      screen.getAllByLabelText('modules.print.brandOverridePlaceholder')[0],
      {
        target: { value: '抚新' },
      },
    )
    fireEvent.click(screen.getByText('modules.print.preview'))

    expect(onPrint).toHaveBeenCalledWith('preview', coordTemplate, {
      hideUnitPrice: false,
      hideRemark: false,
      brandOverridesByItemId: {
        'item-1': '抚新',
      },
      itemOrder: ['item-1', 'item-2'],
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
      hideRemark: false,
      itemOrder: ['item-1'],
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
      hideRemark: false,
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
      hideRemark: false,
    })
  })

  it('shows sales order print xlsx export action', () => {
    const onExportPrintXlsx = vi.fn()
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
        onExportPrintXlsx={onExportPrintXlsx}
        onPrint={vi.fn()}
        open
        moduleKey="sales-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1' }]}
        templates={[]}
      />,
    )

    fireEvent.click(screen.getByLabelText('modules.print.hideUnitPrice'))
    fireEvent.click(screen.getByLabelText('modules.print.hideRemark'))
    fireEvent.click(screen.getByLabelText('modules.print.enableBrandOverride'))
    fireEvent.change(
      screen.getByLabelText('modules.print.brandOverridePlaceholder'),
      {
        target: { value: '抚新' },
      },
    )
    fireEvent.click(screen.getByText('modules.print.exportXlsx'))

    expect(onExportPrintXlsx).toHaveBeenCalledWith({
      hideUnitPrice: true,
      hideRemark: true,
      brandOverridesByItemId: {
        'item-1': '抚新',
      },
      itemOrder: ['item-1'],
    })
  })

  it('hides print xlsx export action outside sales order module', () => {
    render(
      <PrintJobModal
        onClose={vi.fn()}
        onExportPrintXlsx={vi.fn()}
        onPrint={vi.fn()}
        open
        moduleKey="purchase-order"
        selectedCount={1}
        selectedRowKeys={['1']}
        selectedRows={[{ id: '1' }]}
        templates={[]}
      />,
    )

    expect(screen.queryByText('modules.print.exportXlsx')).toBeNull()
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
    expect(screen.getByText('modules.print.noPrintItems')).toBeTruthy()
  })

  it('reorders print item ids by drag source and target', () => {
    expect(
      reorderPrintItemIds(['item-1', 'item-2', 'item-3'], 'item-1', 'item-3'),
    ).toEqual(['item-2', 'item-3', 'item-1'])
    expect(
      reorderPrintItemIds(['item-1', 'item-2'], 'missing', 'item-2'),
    ).toEqual(['item-1', 'item-2'])
  })
})
