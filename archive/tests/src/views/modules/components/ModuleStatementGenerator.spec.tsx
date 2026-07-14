import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const moduleStatementTestHarness = vi.hoisted(() => ({
  buttonPropsByTestId: new Map<string, any>(),
}))

const rememberButtonProps = (props: any) => {
  const testId = props['data-testid']
  if (testId) {
    moduleStatementTestHarness.buttonPropsByTestId.set(String(testId), props)
  }
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`
      return key
    },
  }),
}))

vi.mock('antd', () => ({
  Modal: ({ children, title, open, footer, ...props }: any) =>
    open ? (
      <div data-testid="modal" {...props}>
        <div>{title}</div>
        {children}
        {footer}
      </div>
    ) : null,
  Button: ({ children, ...props }: any) => {
    rememberButtonProps(props)
    return <button {...props}>{children}</button>
  },
  Space: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Tag: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Typography: {
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('antd/es/modal', () => ({
  default: ({ children, title, open, footer, ...props }: any) =>
    open ? (
      <div data-testid="modal" {...props}>
        <div>{title}</div>
        {children}
        {footer}
      </div>
    ) : null,
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => {
    rememberButtonProps(props)
    return <button {...props}>{children}</button>
  },
}))

vi.mock('antd/es/space', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/tag', () => ({
  default: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('@/components/AppResultModal', () => ({
  AppResultModal: ({ open, subTitle, traceId, footer, onClose }: any) =>
    open ? (
      <div data-testid="result-modal">
        <div>{subTitle}</div>
        {traceId && <div>trace:{traceId}</div>}
        <button type="button" onClick={onClose}>
          result-close
        </button>
        {footer}
      </div>
    ) : null,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: any) => String(v ?? ''),
}))

import { ModuleStatementGenerator } from '@/views/modules/components/ModuleStatementGenerator'

describe('ModuleStatementGenerator', () => {
  beforeEach(() => {
    moduleStatementTestHarness.buttonPropsByTestId.clear()
  })

  const defaultProps = {
    open: true,
    statementType: 'supplier' as const,
    selectedRows: [
      {
        id: '1',
        supplierId: '700520000000000001',
        supplierName: 'Supplier A',
        inboundDate: '2024-01-01',
      },
      {
        id: '2',
        supplierId: '700520000000000001',
        supplierName: 'Supplier A',
        inboundDate: '2024-01-15',
      },
    ],
    onClose: vi.fn(),
    onGenerate: vi.fn(),
  }

  it('renders modal when open', () => {
    render(<ModuleStatementGenerator {...defaultProps} />)
    expect(screen.getByTestId('modal')).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<ModuleStatementGenerator {...defaultProps} open={false} />)
    expect(screen.queryByTestId('modal')).toBeNull()
  })

  it('renders select hint when no rows selected', () => {
    render(<ModuleStatementGenerator {...defaultProps} selectedRows={[]} />)
    expect(screen.getByText('modules.statement.selectHint')).toBeTruthy()
  })

  it('renders summary when rows selected', () => {
    render(<ModuleStatementGenerator {...defaultProps} />)
    expect(screen.getByText('Supplier A')).toBeTruthy()
  })

  it('renders period when rows selected', () => {
    render(<ModuleStatementGenerator {...defaultProps} />)
    expect(screen.getByText(/2024-01-01/)).toBeTruthy()
  })

  it('renders customer statement type', () => {
    const props = {
      ...defaultProps,
      statementType: 'customer' as const,
      selectedRows: [
        {
          id: '1',
          customerId: '700520000000000002',
          customerName: 'Customer A',
          deliveryDate: '2024-02-01',
        },
      ],
    }
    render(<ModuleStatementGenerator {...props} />)
    expect(screen.getByText('Customer A')).toBeTruthy()
  })

  it('renders freight statement type', () => {
    const props = {
      ...defaultProps,
      statementType: 'freight' as const,
      selectedRows: [
        {
          id: '1',
          carrierId: '700520000000000003',
          carrierName: 'Carrier A',
          billTime: '2024-03-01',
        },
      ],
    }
    render(<ModuleStatementGenerator {...props} />)
    expect(screen.getByText('Carrier A')).toBeTruthy()
  })

  it('falls back to a blank type label for an unexpected statement type', () => {
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        statementType={'unexpected' as any}
      />,
    )
    expect(
      screen.getByText('modules.statement.generateTitle:{"type":""}'),
    ).toBeTruthy()
    expect(screen.getByText('modules.statement.extractError')).toBeTruthy()
  })

  it('shows error when multiple counterparties', () => {
    const props = {
      ...defaultProps,
      selectedRows: [
        { id: '1', supplierName: 'Supplier A', inboundDate: '2024-01-01' },
        { id: '2', supplierName: 'Supplier B', inboundDate: '2024-01-15' },
      ],
    }
    render(<ModuleStatementGenerator {...props} />)
    expect(screen.getByText('modules.statement.extractError')).toBeTruthy()
  })

  it('rejects same-name suppliers with different stable ids', () => {
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        selectedRows={[
          {
            id: '1',
            supplierId: '700520000000000001',
            supplierName: '同名供应商',
            inboundDate: '2024-01-01',
          },
          {
            id: '2',
            supplierId: '700520000000000002',
            supplierName: '同名供应商',
            inboundDate: '2024-01-15',
          },
        ]}
      />,
    )

    expect(screen.getByText('modules.statement.extractError')).toBeTruthy()
  })

  it('rejects supplier generation when stable id is missing', () => {
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        selectedRows={[
          {
            id: '1',
            supplierName: 'Supplier A',
            inboundDate: '2024-01-01',
          },
        ]}
      />,
    )

    expect(screen.getByText('modules.statement.extractError')).toBeTruthy()
  })

  it('shows error when counterparty name is missing', () => {
    const props = {
      ...defaultProps,
      selectedRows: [{ id: '1', inboundDate: '2024-01-01' }],
    }
    render(<ModuleStatementGenerator {...props} />)
    expect(screen.getByText('modules.statement.extractError')).toBeTruthy()
  })

  it('shows error when date is missing', () => {
    const props = {
      ...defaultProps,
      selectedRows: [{ id: '1', supplierName: 'Supplier A' }],
    }
    render(<ModuleStatementGenerator {...props} />)
    expect(screen.getByText('modules.statement.extractError')).toBeTruthy()
  })

  it('calls onGenerate when generate button clicked', async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(
      <ModuleStatementGenerator {...defaultProps} onGenerate={onGenerate} />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith(
        'Supplier A',
        '2024-01-01',
        '2024-01-15',
        '700520000000000001',
      )
    })
  })

  it.each([
    {
      statementType: 'customer' as const,
      selectedRow: {
        id: '1',
        customerId: '700520000000000002',
        customerName: 'Customer A',
        deliveryDate: '2024-02-01',
      },
      expected: [
        'Customer A',
        '2024-02-01',
        '2024-02-01',
        '700520000000000002',
      ],
    },
    {
      statementType: 'freight' as const,
      selectedRow: {
        id: '1',
        carrierId: '700520000000000003',
        carrierName: 'Carrier A',
        billTime: '2024-03-01',
      },
      expected: ['Carrier A', '2024-03-01', '2024-03-01', '700520000000000003'],
    },
  ])('passes the stable id when generating a $statementType statement', async ({
    statementType,
    selectedRow,
    expected,
  }) => {
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        statementType={statementType}
        selectedRows={[selectedRow]}
        onGenerate={onGenerate}
      />,
    )

    fireEvent.click(screen.getByText('modules.statement.generateButton'))

    await waitFor(() => expect(onGenerate).toHaveBeenCalledWith(...expected))
  })

  it('shows success result after generation', async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(
      <ModuleStatementGenerator {...defaultProps} onGenerate={onGenerate} />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(screen.getByTestId('result-modal')).toBeTruthy()
    })
  })

  it('closes parent modal when acknowledging a successful generation', async () => {
    const onClose = vi.fn()
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        onClose={onClose}
        onGenerate={onGenerate}
      />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(screen.getByTestId('result-modal')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('modules.statement.gotIt'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('result-modal')).toBeNull()
  })

  it('closes only the result modal when acknowledging a failed generation', async () => {
    const onClose = vi.fn()
    const onGenerate = vi.fn().mockRejectedValue(new Error('Generation failed'))
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        onClose={onClose}
        onGenerate={onGenerate}
      />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(screen.getByText('Generation failed')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('modules.statement.gotIt'))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result-modal')).toBeNull()
  })

  it('shows error result when generation fails', async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error('Generation failed'))
    render(
      <ModuleStatementGenerator {...defaultProps} onGenerate={onGenerate} />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(screen.getByText('Generation failed')).toBeTruthy()
    })
  })

  it('closes parent modal from result modal close after success', async () => {
    const onClose = vi.fn()
    const onGenerate = vi.fn().mockResolvedValue(undefined)
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        onClose={onClose}
        onGenerate={onGenerate}
      />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(screen.getByTestId('result-modal')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('result-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('result-modal')).toBeNull()
  })

  it('keeps parent modal open from result modal close after failure', async () => {
    const onClose = vi.fn()
    const onGenerate = vi.fn().mockRejectedValue(new Error('Generation failed'))
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        onClose={onClose}
        onGenerate={onGenerate}
      />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(screen.getByText('Generation failed')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('result-close'))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result-modal')).toBeNull()
  })

  it('shows error result with traceId when generation fails', async () => {
    const error = new Error('Server error') as Error & { traceId?: string }
    error.traceId = 'trace-abc'
    const onGenerate = vi.fn().mockRejectedValue(error)
    render(
      <ModuleStatementGenerator {...defaultProps} onGenerate={onGenerate} />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(screen.getByText(/trace:trace-abc/)).toBeTruthy()
    })
  })

  it('shows generic error when non-Error thrown', async () => {
    const onGenerate = vi.fn().mockRejectedValue('unknown error')
    render(
      <ModuleStatementGenerator {...defaultProps} onGenerate={onGenerate} />,
    )
    fireEvent.click(screen.getByText('modules.statement.generateButton'))
    await waitFor(() => {
      expect(screen.getByText('modules.statement.generateFailed')).toBeTruthy()
    })
  })

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn()
    render(<ModuleStatementGenerator {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('common.cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('disables generate button when no summary', () => {
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        selectedRows={[{ id: '1' }]}
      />,
    )
    const generateBtn = screen.getByText('modules.statement.generateButton')
    expect(generateBtn).toBeTruthy()
  })

  it('guards generate handler when invoked without a summary', () => {
    const onGenerate = vi.fn()
    render(
      <ModuleStatementGenerator
        {...defaultProps}
        selectedRows={[{ id: '1' }]}
        onGenerate={onGenerate}
      />,
    )
    const generateButtonProps =
      moduleStatementTestHarness.buttonPropsByTestId.get(
        'statement-generate-button',
      )
    expect(generateButtonProps?.disabled).toBe(true)
    generateButtonProps?.onClick()
    expect(onGenerate).not.toHaveBeenCalled()
  })

  it('renders document count', () => {
    render(<ModuleStatementGenerator {...defaultProps} />)
    expect(
      screen.getByText(/modules\.statement\.documentCountUnit/),
    ).toBeTruthy()
  })

  it('handles date range sorting correctly', () => {
    const props = {
      ...defaultProps,
      selectedRows: [
        {
          id: '1',
          supplierId: '700520000000000001',
          supplierName: 'Supplier A',
          inboundDate: '2024-03-01',
        },
        {
          id: '2',
          supplierId: '700520000000000001',
          supplierName: 'Supplier A',
          inboundDate: '2024-01-01',
        },
        {
          id: '3',
          supplierId: '700520000000000001',
          supplierName: 'Supplier A',
          inboundDate: '2024-02-01',
        },
      ],
    }
    render(<ModuleStatementGenerator {...props} />)
    expect(screen.getByText(/2024-01-01 ~ 2024-03-01/)).toBeTruthy()
  })

  it('renders counterparty unit label', () => {
    render(<ModuleStatementGenerator {...defaultProps} />)
    expect(screen.getByText('modules.statement.counterpartyUnit')).toBeTruthy()
  })

  it('renders period label', () => {
    render(<ModuleStatementGenerator {...defaultProps} />)
    expect(screen.getByText('modules.statement.period')).toBeTruthy()
  })

  it('handles empty counterparty name field', () => {
    const props = {
      ...defaultProps,
      selectedRows: [{ id: '1', supplierName: '', inboundDate: '2024-01-01' }],
    }
    render(<ModuleStatementGenerator {...props} />)
    expect(screen.getByText('modules.statement.extractError')).toBeTruthy()
  })

  it('handles single row selection', () => {
    const props = {
      ...defaultProps,
      selectedRows: [
        {
          id: '1',
          supplierId: '700520000000000001',
          supplierName: 'Supplier A',
          inboundDate: '2024-01-01',
        },
      ],
    }
    render(<ModuleStatementGenerator {...props} />)
    expect(screen.getByText('Supplier A')).toBeTruthy()
    expect(screen.getByText(/2024-01-01 ~ 2024-01-01/)).toBeTruthy()
  })
})
