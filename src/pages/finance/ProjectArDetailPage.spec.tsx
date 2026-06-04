import { useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.mocked(useQuery)

vi.mock('@tanstack/react-router', () => ({
  useLocation: vi.fn().mockReturnValue({ pathname: '/project-ar/123' }),
  useNavigate: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockImplementation(({ queryKey }) => {
    const key = queryKey[0]
    if (key === 'project-ar-summary') {
      return {
        data: {
          projectId: 123,
          customerCode: 'C001',
          customerName: 'Test Customer',
          projectName: 'Test Project',
          projectNameAbbr: 'TP',
          projectManager: 'John Doe',
          projectAddress: '123 Test St',
          projectStatus: 'Active',
          completedSalesAmount: 100000,
          prepaymentBalance: 20000,
          unreceivedAmount: 30000,
          netUnreceivedAmount: 25000,
        },
        isLoading: false,
        isFetching: false,
      }
    }
    if (key === 'project-ar-detail') {
      return {
        data: {
          content: [
            {
              sourceDocumentId: 1001,
              sourceDocumentNo: 'DOC001',
              documentType: 'Invoice',
              businessDate: '2024-01-01',
              customerCode: 'C001',
              customerName: 'Test Customer',
              amount: 50000,
              writtenOffAmount: 20000,
              unwrittenOffAmount: 30000,
              reconciliationStatus: 'Unreconciled',
              receiptStatus: 'Pending',
              operatorName: 'Admin',
              remark: 'Test remark',
            },
          ],
          totalElements: 1,
        },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      }
    }
    return { data: null, isLoading: false, isFetching: false }
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'finance.projectArDetail.title': 'Project AR Detail',
        'finance.projectArDetail.projectOverview': 'Project Overview',
        'finance.projectArDetail.projectName': 'Project Name',
        'finance.projectArDetail.projectNameAbbr': 'Project Abbr',
        'finance.projectArDetail.customerCode': 'Customer Code',
        'finance.projectArDetail.customerName': 'Customer Name',
        'finance.projectArDetail.projectAddress': 'Project Address',
        'finance.projectArDetail.projectStatus': 'Project Status',
        'finance.projectArDetail.projectManager': 'Project Manager',
        'finance.projectArDetail.contactPerson': 'Contact Person',
        'finance.projectArDetail.completedSalesAmount': 'Completed Sales',
        'finance.projectArDetail.prepaymentBalance': 'Prepayment Balance',
        'finance.projectArDetail.unreceivedAmount': 'Unreceived Amount',
        'finance.projectArDetail.netUnreceivedAmount': 'Net Unreceived',
        'finance.projectArDetail.unreconciledTab': 'Unreconciled ({{count}})',
        'finance.projectArDetail.reconciledTab': 'Reconciled ({{count}})',
        'finance.projectArDetail.sourceDocumentNo': 'Document No',
        'finance.projectArDetail.documentType': 'Document Type',
        'finance.projectArDetail.businessDate': 'Business Date',
        'finance.projectArDetail.amount': 'Amount',
        'finance.projectArDetail.writtenOffAmount': 'Written Off',
        'finance.projectArDetail.unwrittenOffAmount': 'Unwritten Off',
        'finance.projectArDetail.reconciliationStatus': 'Reconciliation Status',
        'finance.projectArDetail.receiptStatus': 'Receipt Status',
        'finance.projectArDetail.operatorName': 'Operator',
        'common.remark': 'Remark',
        'common.back': 'Back',
      }
      return map[key] ?? key
    },
    i18n: { language: 'en-US' },
  }),
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: vi.fn(),
  http: {
    get: vi.fn(),
  },
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    projectArSummary: vi.fn().mockReturnValue(['project-ar-summary', '123']),
    projectArDetail: vi
      .fn()
      .mockReturnValue(['project-ar-detail', '123', 'unreconciled']),
  },
}))

vi.mock('@/utils/formatters', () => ({
  formatDate: vi.fn().mockReturnValue('2024-01-01'),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, onClick, icon }: any) => (
    <button onClick={onClick} data-testid="back-button">
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, title }: any) => (
    <div data-testid="card">
      <div data-testid="card-title">{title}</div>
      {children}
    </div>
  ),
}))

vi.mock('antd/es/descriptions', () => {
  const Descriptions = ({ children, title }: any) => (
    <div data-testid="descriptions">{children}</div>
  )
  Descriptions.Item = ({ children, label }: any) => (
    <div data-testid="description-item">
      <span data-testid="description-label">{label}</span>
      <span data-testid="description-value">{children}</span>
    </div>
  )
  return { default: Descriptions }
})

vi.mock('antd/es/flex', () => ({
  default: ({ children, justify, align, gap, className }: any) => (
    <div data-testid="flex" className={className}>
      {children}
    </div>
  ),
}))

vi.mock('antd/es/spin', () => ({
  default: ({ size }: any) => (
    <div data-testid="spin" data-size={size}>
      Loading...
    </div>
  ),
}))

vi.mock('antd/es/table', () => {
  const Table = ({ columns, dataSource, loading, rowKey }: any) => (
    <div data-testid="table">
      <div data-testid="table-loading">{String(loading)}</div>
      <div data-testid="table-row-count">{dataSource?.length ?? 0}</div>
      {dataSource?.map((row: any, index: number) => {
        const resolvedKey =
          typeof rowKey === 'function' ? rowKey(row, index) : row[rowKey]
        return (
          <div
            key={resolvedKey}
            data-testid="table-row"
            data-row-key={resolvedKey}
          >
            {columns?.map((col: any) => (
              <span key={col.dataIndex} data-testid={`cell-${col.dataIndex}`}>
                {row[col.dataIndex]}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
  return { default: Table }
})

vi.mock('antd/es/tabs', () => ({
  default: ({ items, activeKey, onChange }: any) => (
    <div data-testid="tabs">
      <div data-testid="active-tab">{activeKey}</div>
      {items?.map((item: any) => (
        <button
          key={item.key}
          data-testid={`tab-${item.key}`}
          onClick={() => onChange?.(item.key)}
        >
          {item.label}
        </button>
      ))}
      <div data-testid="tab-content">
        {items?.find((item: any) => item.key === activeKey)?.children}
      </div>
    </div>
  ),
}))

vi.mock('antd/es/typography', () => {
  const Typography = ({ children, className }: any) => (
    <div className={className}>{children}</div>
  )
  Typography.Title = ({ children, level, className }: any) => (
    <h1 data-testid="title" data-level={level} className={className}>
      {children}
    </h1>
  )
  Typography.Text = ({ children, strong, color, className }: any) => (
    <span
      data-testid="text"
      data-strong={strong}
      data-color={color}
      className={className}
    >
      {children}
    </span>
  )
  return { default: Typography }
})

vi.mock('@ant-design/icons', () => ({
  ArrowLeftOutlined: () => <span data-testid="arrow-icon">←</span>,
}))

import { ProjectArDetailPage } from '@/pages/finance/ProjectArDetailPage'

describe('ProjectArDetailPage', () => {
  afterEach(() => {
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      const key = queryKey[0]
      if (key === 'project-ar-summary') {
        return {
          data: {
            projectId: 123,
            customerCode: 'C001',
            customerName: 'Test Customer',
            projectName: 'Test Project',
            projectNameAbbr: 'TP',
            projectManager: 'John Doe',
            projectAddress: '123 Test St',
            projectStatus: 'Active',
            completedSalesAmount: 100000,
            prepaymentBalance: 20000,
            unreceivedAmount: 30000,
            netUnreceivedAmount: 25000,
          },
          isLoading: false,
          isFetching: false,
        }
      }
      if (key === 'project-ar-detail') {
        return {
          data: {
            content: [
              {
                sourceDocumentId: 1001,
                sourceDocumentNo: 'DOC001',
                documentType: 'Invoice',
                businessDate: '2024-01-01',
                customerCode: 'C001',
                customerName: 'Test Customer',
                amount: 50000,
                writtenOffAmount: 20000,
                unwrittenOffAmount: 30000,
                reconciliationStatus: 'Unreconciled',
                receiptStatus: 'Pending',
                operatorName: 'Admin',
                remark: 'Test remark',
              },
            ],
            totalElements: 1,
          },
          isLoading: false,
          isFetching: false,
          refetch: vi.fn(),
        }
      }
      return { data: null, isLoading: false, isFetching: false }
    })
  })

  it('renders loading state initially', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: true,
    } as any)
    render(<ProjectArDetailPage />)
    expect(screen.getByTestId('spin')).toBeDefined()
  })

  it('renders page title', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Project AR Detail')).toBeDefined()
    })
  })

  it('renders back button', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('back-button')).toBeDefined()
    })
  })

  it('renders project overview card', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Project Overview')).toBeDefined()
    })
  })

  it('displays project summary data', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeDefined()
      expect(screen.getAllByText('C001').length).toBeGreaterThanOrEqual(1)
      expect(
        screen.getAllByText('Test Customer').length,
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders tabs for reconciled and unreconciled', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('tab-unreconciled')).toBeDefined()
      expect(screen.getByTestId('tab-reconciled')).toBeDefined()
    })
  })

  it('displays unreconciled tab as active by default', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('active-tab').textContent).toBe('unreconciled')
    })
  })

  it('renders table with data', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('table')).toBeDefined()
      expect(screen.getByTestId('table-row-count').textContent).toBe('1')
    })
  })

  it('displays table row data', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('DOC001')).toBeDefined()
      expect(screen.getByText('Invoice')).toBeDefined()
    })
  })

  it('uses non-empty unique row keys when document numbers are blank', async () => {
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      const key = queryKey[0]
      if (key === 'project-ar-summary') {
        return {
          data: {
            projectId: 123,
            customerCode: 'C001',
            customerName: 'Test Customer',
            projectName: 'Test Project',
            projectNameAbbr: 'TP',
            projectManager: 'John Doe',
            projectAddress: '123 Test St',
            projectStatus: 'Active',
            completedSalesAmount: 100000,
            prepaymentBalance: 20000,
            unreceivedAmount: 30000,
            netUnreceivedAmount: 25000,
          },
          isLoading: false,
          isFetching: false,
        }
      }
      if (key === 'project-ar-detail') {
        const baseRow = {
          sourceDocumentNo: '',
          documentType: 'Invoice',
          businessDate: '2024-01-01',
          customerCode: 'C001',
          customerName: 'Test Customer',
          amount: 50000,
          writtenOffAmount: 20000,
          unwrittenOffAmount: 30000,
          reconciliationStatus: 'Unreconciled',
          receiptStatus: 'Pending',
          operatorName: 'Admin',
          remark: 'Test remark',
        }
        return {
          data: {
            content: [baseRow, { ...baseRow }],
            totalElements: 2,
          },
          isLoading: false,
          isFetching: false,
          refetch: vi.fn(),
        }
      }
      return { data: null, isLoading: false, isFetching: false }
    })

    render(<ProjectArDetailPage />)

    await waitFor(() => {
      const rowKeys = screen
        .getAllByTestId('table-row')
        .map((row) => row.getAttribute('data-row-key'))
      expect(rowKeys).toHaveLength(2)
      expect(rowKeys.every(Boolean)).toBe(true)
      expect(new Set(rowKeys).size).toBe(2)
    })
  })

  it('switches tabs when clicked', async () => {
    render(<ProjectArDetailPage />)

    await waitFor(() => {
      expect(screen.getByTestId('tab-reconciled')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('tab-reconciled'))

    await waitFor(() => {
      expect(screen.getByTestId('active-tab').textContent).toBe('reconciled')
    })
  })

  it('formats amounts correctly', async () => {
    render(<ProjectArDetailPage />)
    await waitFor(() => {
      expect(screen.getByText('100,000.00')).toBeDefined()
    })
  })

  it('exports ProjectArDetailPage component', () => {
    expect(ProjectArDetailPage).toBeDefined()
    expect(typeof ProjectArDetailPage).toBe('function')
  })
})
