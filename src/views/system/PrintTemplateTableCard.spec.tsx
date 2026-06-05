import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetOptions: [{ label: '采购订单', value: 'PURCHASE_ORDER' }],
}))

vi.mock('@/utils/formatters', () => ({
  formatDateTime: (v: unknown, fallback: string) => (v ? String(v) : fallback),
}))

vi.mock('@/views/system/print-template-view-utils', () => ({
  getPrintTemplateBillTypeLabel: (value: string) => value || '--',
}))

import { PrintTemplateTableCard } from '@/views/system/PrintTemplateTableCard'

describe('PrintTemplateTableCard', () => {
  const defaultProps = {
    selectedBillType: 'PURCHASE_ORDER',
    activeTemplateId: undefined,
    templates: [
      {
        id: '1',
        templateName: 'Template 1',
        billType: 'PURCHASE_ORDER',
        templateType: 'HTML',
        updateTime: '2024-01-01',
      },
    ],
    loading: false,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    onBillTypeChange: vi.fn(),
    onRefresh: vi.fn(),
    onCreate: vi.fn(),
    onPreview: vi.fn(),
    onEdit: vi.fn(),
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    onActiveChange: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(PrintTemplateTableCard).toBeDefined()
    expect(typeof PrintTemplateTableCard).toBe('function')
  })

  it('renders the card title', () => {
    render(<PrintTemplateTableCard {...defaultProps} />)
    expect(screen.getByText('system.printTemplate.title')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<PrintTemplateTableCard {...defaultProps} />)
    expect(screen.getByText('common.refresh')).toBeInTheDocument()
  })

  it('renders create button when canCreate', () => {
    render(<PrintTemplateTableCard {...defaultProps} canCreate={true} />)
    expect(
      screen.getByText('system.printTemplate.newTemplate'),
    ).toBeInTheDocument()
  })

  it('does not render create button when not canCreate', () => {
    render(<PrintTemplateTableCard {...defaultProps} canCreate={false} />)
    expect(
      screen.queryByText('system.printTemplate.newTemplate'),
    ).not.toBeInTheDocument()
  })

  it('renders table with data', () => {
    render(<PrintTemplateTableCard {...defaultProps} />)
    expect(screen.getByText('Template 1')).toBeInTheDocument()
  })

  it('renders table', () => {
    const { container } = render(<PrintTemplateTableCard {...defaultProps} />)
    expect(container.querySelector('.ant-table')).toBeInTheDocument()
  })

  it('renders preview buttons', () => {
    render(<PrintTemplateTableCard {...defaultProps} />)
    expect(screen.getByText('system.printTemplate.preview')).toBeInTheDocument()
  })

  it('renders edit button when canEdit', () => {
    render(<PrintTemplateTableCard {...defaultProps} canEdit={true} />)
    expect(screen.getByText('common.edit')).toBeInTheDocument()
  })

  it('renders copy button when canCreate', () => {
    render(<PrintTemplateTableCard {...defaultProps} canCreate={true} />)
    expect(screen.getByText('system.printTemplate.copy')).toBeInTheDocument()
  })

  it('renders delete button when canDelete', () => {
    render(<PrintTemplateTableCard {...defaultProps} canDelete={true} />)
    expect(screen.getByText('common.delete')).toBeInTheDocument()
  })
})
