import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetOptions: [{ label: '采购订单', value: 'PURCHASE_ORDER' }],
}))

vi.mock('antd', () => {
  const Button = ({
    children,
    disabled,
    onClick,
  }: {
    children?: React.ReactNode
    disabled?: boolean
    onClick?: (event: { stopPropagation: () => void }) => void
  }) => (
    <button
      disabled={disabled}
      type="button"
      onClick={() => onClick?.({ stopPropagation: vi.fn() })}
    >
      {children ?? 'more'}
    </button>
  )
  const Card = ({
    children,
    extra,
    title,
  }: {
    children?: React.ReactNode
    extra?: React.ReactNode
    title?: React.ReactNode
  }) => (
    <section>
      {title && <h2>{title}</h2>}
      {extra}
      {children}
    </section>
  )
  const Descriptions = ({ children }: { children?: React.ReactNode }) => (
    <dl>{children}</dl>
  )
  Descriptions.Item = ({
    children,
    label,
  }: {
    children?: React.ReactNode
    label?: React.ReactNode
  }) => (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
  const Input = () => <input />
  Input.Search = ({
    placeholder,
    value,
    onChange,
  }: {
    placeholder?: string
    value?: string
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  }) => (
    <input
      aria-label={placeholder}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
  const Space = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  )

  return {
    Button,
    Card,
    Descriptions,
    Dropdown: ({
      children,
      menu,
    }: {
      children?: React.ReactNode
      menu?: {
        items?: Array<{
          disabled?: boolean
          key: string
          label: React.ReactNode
          onClick?: () => void
        } | null>
      }
    }) => (
      <div>
        {children}
        <div>
          {(menu?.items ?? []).filter(Boolean).map((item) => {
            const action = item!
            return action.onClick ? (
              <button
                disabled={action.disabled}
                key={action.key}
                type="button"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ) : (
              <span key={action.key}>{action.label}</span>
            )
          })}
        </div>
      </div>
    ),
    Empty: ({ description }: { description?: React.ReactNode }) => (
      <div>{description}</div>
    ),
    Input,
    Select: ({
      options = [],
      value,
      onChange,
    }: {
      options?: Array<{ label: string; value: string }>
      value?: string
      onChange?: (value: string) => void
    }) => (
      <select
        aria-label="bill-type"
        value={value}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Space,
    Spin: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Tag: ({
      children,
      title,
    }: {
      children?: React.ReactNode
      title?: string
    }) => <span title={title}>{children}</span>,
    Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Typography: {
      Text: ({ children }: { children?: React.ReactNode }) => (
        <span>{children}</span>
      ),
    },
    Upload: ({
      beforeUpload,
      children,
    }: {
      beforeUpload?: (file: File) => boolean
      children?: React.ReactNode
    }) => (
      <button
        type="button"
        onClick={() =>
          beforeUpload?.(
            new File(['{}'], 'template.json', { type: 'application/json' }),
          )
        }
      >
        {children}
      </button>
    ),
  }
})

vi.mock('@/components/StatusTag', () => ({
  StatusTag: ({
    status,
    statusMap,
  }: {
    status: string
    statusMap: Record<string, { label: string }>
  }) => <span>{statusMap[status]?.label ?? status}</span>,
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
        templateType: 'COORD',
        updateTime: '2024-01-01',
      },
    ],
    loading: false,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    uploadPending: false,
    onBillTypeChange: vi.fn(),
    onRefresh: vi.fn(),
    onCreate: vi.fn(),
    onPreview: vi.fn(),
    onEdit: vi.fn(),
    onCopy: vi.fn(),
    onUploadJson: vi.fn(),
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
    expect(screen.getAllByText('Template 1')).not.toHaveLength(0)
  })

  it('renders template workbench', () => {
    const { container } = render(<PrintTemplateTableCard {...defaultProps} />)
    expect(container.querySelector('.print-template-shell')).toBeInTheDocument()
    expect(
      container.querySelector('.print-template-list-item'),
    ).toBeInTheDocument()
  })

  it('renders preview buttons', () => {
    render(<PrintTemplateTableCard {...defaultProps} />)
    expect(screen.getByText('system.printTemplate.preview')).toBeInTheDocument()
  })

  it('renders edit button when canEdit', () => {
    render(<PrintTemplateTableCard {...defaultProps} canEdit={true} />)
    expect(screen.getByText('common.edit')).toBeInTheDocument()
  })

  it('opens copy and delete actions from more menu', async () => {
    render(<PrintTemplateTableCard {...defaultProps} />)
    fireEvent.click(screen.getAllByRole('button', { name: /more/i })[0])

    expect(
      await screen.findByText('system.printTemplate.copy'),
    ).toBeInTheDocument()
    expect(await screen.findByText('common.delete')).toBeInTheDocument()
  })

  it('renders upload json action for PDF_FORM templates only', async () => {
    render(
      <PrintTemplateTableCard
        {...defaultProps}
        templates={[
          {
            id: 'pdf-1',
            templateName: 'PDF Template',
            billType: 'PURCHASE_ORDER',
            templateType: 'PDF_FORM',
            updateTime: '2024-01-01',
          },
        ]}
        canEdit={true}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /more/i })[0])
    expect(
      await screen.findByText('system.printTemplate.uploadJson'),
    ).toBeInTheDocument()
  })

  it('disables upload json action while upload is pending', async () => {
    render(
      <PrintTemplateTableCard
        {...defaultProps}
        templates={[
          {
            id: 'pdf-1',
            templateName: 'PDF Template',
            billType: 'PURCHASE_ORDER',
            templateType: 'PDF_FORM',
            updateTime: '2024-01-01',
          },
        ]}
        canEdit={true}
        uploadPending={true}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /more/i })[0])
    expect(
      await screen.findByText('system.printTemplate.uploadJson'),
    ).toBeInTheDocument()
  })

  it('does not render upload json button for COORD templates', () => {
    render(<PrintTemplateTableCard {...defaultProps} canEdit={true} />)
    fireEvent.click(screen.getAllByRole('button', { name: /more/i })[0])

    expect(
      screen.queryByText('system.printTemplate.uploadJson'),
    ).not.toBeInTheDocument()
  })

  it('calls toolbar handlers', () => {
    const onBillTypeChange = vi.fn()
    const onRefresh = vi.fn()
    const onCreate = vi.fn()

    render(
      <PrintTemplateTableCard
        {...defaultProps}
        onBillTypeChange={onBillTypeChange}
        onCreate={onCreate}
        onRefresh={onRefresh}
      />,
    )

    fireEvent.change(screen.getByLabelText('bill-type'), {
      target: { value: 'PURCHASE_ORDER' },
    })
    fireEvent.click(screen.getByText('common.refresh'))
    fireEvent.click(screen.getByText('system.printTemplate.newTemplate'))

    expect(onBillTypeChange).toHaveBeenCalledWith('PURCHASE_ORDER')
    expect(onRefresh).toHaveBeenCalled()
    expect(onCreate).toHaveBeenCalled()
  })

  it('filters templates by keyword and renders empty state', () => {
    render(
      <PrintTemplateTableCard
        {...defaultProps}
        templates={[
          {
            id: '1',
            templateName: 'Purchase Template',
            templateCode: 'PUR-001',
            billType: 'PURCHASE_ORDER',
            templateType: 'COORD',
            updateTime: '2024-01-01',
          },
        ]}
      />,
    )

    fireEvent.change(
      screen.getByLabelText('system.printTemplate.searchPlaceholder'),
      { target: { value: 'missing' } },
    )

    expect(
      screen.getAllByText('system.printTemplate.emptyList').length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('filters templates by optional fields', () => {
    render(
      <PrintTemplateTableCard
        {...defaultProps}
        templates={[
          {
            id: '1',
            templateName: 'Purchase Template',
            templateCode: 'PUR-001',
            billType: 'PURCHASE_ORDER',
            templateType: 'COORD',
            engine: 'handlebars',
            sourceRef: 'file://purchase.json',
            settlementCompanyName: 'A Company',
            updateTime: '2024-01-01',
          },
        ]}
      />,
    )

    fireEvent.change(
      screen.getByLabelText('system.printTemplate.searchPlaceholder'),
      { target: { value: 'company' } },
    )

    expect(screen.getAllByText('Purchase Template').length).toBeGreaterThan(0)
  })

  it('calls list and detail actions', () => {
    const onActiveChange = vi.fn()
    const onPreview = vi.fn()
    const onEdit = vi.fn()
    const onCopy = vi.fn()
    const onDelete = vi.fn()

    render(
      <PrintTemplateTableCard
        {...defaultProps}
        onActiveChange={onActiveChange}
        onCopy={onCopy}
        onDelete={onDelete}
        onEdit={onEdit}
        onPreview={onPreview}
      />,
    )

    fireEvent.click(screen.getByRole('button', { pressed: true }))
    screen.getAllByText('more').forEach((button) => {
      fireEvent.click(button)
    })
    fireEvent.click(screen.getAllByText('system.printTemplate.preview')[0])
    fireEvent.click(screen.getAllByText('common.edit')[0])
    fireEvent.click(screen.getByText('system.printTemplate.copy'))
    fireEvent.click(screen.getByText('common.delete'))

    expect(onActiveChange).toHaveBeenCalledWith('1')
    expect(onPreview).toHaveBeenCalledWith(defaultProps.templates[0])
    expect(onEdit).toHaveBeenCalledWith(defaultProps.templates[0])
    expect(onCopy).toHaveBeenCalledWith(defaultProps.templates[0])
    expect(onDelete).toHaveBeenCalledWith(defaultProps.templates[0])
  })

  it('omits delete action when delete permission is missing', () => {
    render(<PrintTemplateTableCard {...defaultProps} canDelete={false} />)

    expect(screen.queryByText('common.delete')).not.toBeInTheDocument()
  })

  it('uploads json for editable pdf form templates', () => {
    const onUploadJson = vi.fn()

    render(
      <PrintTemplateTableCard
        {...defaultProps}
        templates={[
          {
            id: 'pdf-1',
            templateName: 'PDF Template',
            billType: 'PURCHASE_ORDER',
            templateType: 'PDF_FORM',
            updateTime: '2024-01-01',
          },
        ]}
        onUploadJson={onUploadJson}
      />,
    )

    fireEvent.click(screen.getByText('system.printTemplate.uploadJson'))

    expect(onUploadJson).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pdf-1' }),
      expect.any(File),
    )
  })

  it('skips upload while upload is pending', () => {
    const onUploadJson = vi.fn()

    render(
      <PrintTemplateTableCard
        {...defaultProps}
        templates={[
          {
            id: 'pdf-1',
            templateName: 'PDF Template',
            billType: 'PURCHASE_ORDER',
            templateType: 'PDF_FORM',
            updateTime: '2024-01-01',
          },
        ]}
        uploadPending
        onUploadJson={onUploadJson}
      />,
    )

    fireEvent.click(screen.getByText('system.printTemplate.uploadJson'))

    expect(onUploadJson).not.toHaveBeenCalled()
  })

  it('renders file-managed and disabled template details', () => {
    render(
      <PrintTemplateTableCard
        {...defaultProps}
        activeTemplateId="file-1"
        templates={[
          {
            id: 'file-1',
            templateName: 'File Template',
            billType: '',
            templateType: 'PDF_FORM',
            status: 'DISABLED',
            syncMode: 'FILE',
            sourceRef: 'templates/file.json',
            assetRef: 'asset-1',
            settlementCompanyName: '  ',
            templateHtml: '',
            updateTime: '',
          },
        ]}
      />,
    )

    expect(
      screen.getAllByText('system.printTemplate.statusDisabled').length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText('system.printTemplate.syncModeFile').length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText('system.printTemplate.unassignedCompany').length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByText('system.printTemplatePreview.emptyTemplate'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(1)
  })

  it('renders file sync tag without source title when source ref is missing', () => {
    render(
      <PrintTemplateTableCard
        {...defaultProps}
        templates={[
          {
            id: 'file-2',
            templateName: 'File Template Without Source',
            billType: 'PURCHASE_ORDER',
            templateType: 'PDF_FORM',
            syncMode: 'FILE',
            updateTime: '2024-01-01',
          },
        ]}
      />,
    )

    expect(
      screen.getAllByText('system.printTemplate.syncModeFile').length,
    ).toBeGreaterThan(0)
  })

  it('renders empty detail state when there are no templates', () => {
    render(<PrintTemplateTableCard {...defaultProps} templates={[]} />)

    expect(
      screen.getAllByText('system.printTemplate.emptyList').length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('marks non-active list rows', () => {
    const { container } = render(
      <PrintTemplateTableCard
        {...defaultProps}
        activeTemplateId="2"
        templates={[
          {
            id: '1',
            templateName: 'Template 1',
            billType: 'PURCHASE_ORDER',
            templateType: 'COORD',
            updateTime: '2024-01-01',
          },
          {
            id: '2',
            templateName: 'Template 2',
            billType: 'PURCHASE_ORDER',
            templateType: 'COORD',
            updateTime: '2024-01-02',
          },
        ]}
      />,
    )

    expect(container.querySelectorAll('.is-active')).toHaveLength(1)
  })
})
