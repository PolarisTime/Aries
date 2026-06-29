import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
  }),
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/spin', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/table', () => ({
  default: ({ columns, dataSource, rowKey }: any) => (
    <table>
      <thead>
        <tr>
          {columns?.map((column: any) => (
            <th key={column.dataIndex}>{column.title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dataSource?.map((row: any, index: number) => (
          <tr key={String(row[rowKey] ?? index)}>
            {columns?.map((column: any) => {
              const value = row[column.dataIndex]
              return (
                <td key={column.dataIndex}>
                  {column.render ? column.render(value, row) : String(value)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('@/api/business', () => ({
  getBusinessModuleDetail: vi.fn(),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    freightPickup: vi.fn().mockReturnValue(['freight-pickup']),
  },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asId: (v: any) => String(v),
  asString: (v: any) =>
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
      ? String(v)
      : '',
}))

vi.mock('./WorkspaceOverlay', () => ({
  WorkspaceOverlay: ({ children, title, open }: any) =>
    open ? (
      <div data-testid="overlay">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

import { ModuleFreightPickupListOverlay } from '@/views/modules/components/ModuleFreightPickupListOverlay'

describe('ModuleFreightPickupListOverlay', () => {
  const defaultProps = {
    open: true,
    moduleKey: 'freight-bill',
    records: [
      {
        id: '1',
        billNo: 'FB-001',
        customerName: 'Customer A',
        projectName: 'Project X',
        carrierName: 'Carrier A',
        vehiclePlate: 'ABC123',
        totalWeight: 1000,
        totalFreight: 5000,
        items: [
          {
            id: 'i1',
            projectName: 'Project X',
            warehouseName: 'Dock A',
            brand: 'Brand A',
            material: 'Q235',
            spec: '10#',
            length: '12m',
            quantity: 10,
            weightTon: 1.234,
          },
          {
            id: 'i2',
            projectName: 'Project Y',
            warehouseName: 'Dock B',
            brand: 'Brand B',
            material: 'Q355',
            spec: '12#',
            length: '9m',
            quantity: 20,
            weightTon: 2.345,
          },
        ],
      },
    ],
    onClose: vi.fn(),
  }

  it('renders overlay when open', () => {
    render(<ModuleFreightPickupListOverlay {...defaultProps} />)
    expect(screen.getByTestId('overlay')).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<ModuleFreightPickupListOverlay {...defaultProps} open={false} />)
    expect(screen.queryByTestId('overlay')).toBeNull()
  })

  it('renders record details', () => {
    render(<ModuleFreightPickupListOverlay {...defaultProps} />)
    expect(screen.getByText(/FB-001/)).toBeTruthy()
    expect(screen.getByText(/Carrier A/)).toBeTruthy()
    expect(screen.queryByText(/Customer A/)).toBeNull()
  })

  it('renders pickup location instead of outbound number and groups by project', () => {
    render(<ModuleFreightPickupListOverlay {...defaultProps} />)

    expect(
      screen.getAllByText('modules.freightPickup.pickupLocation'),
    ).toHaveLength(2)
    expect(screen.queryByText('modules.itemColumns.sourceNo')).toBeNull()
    expect(screen.getAllByText(/Project X|Project Y/)).toHaveLength(2)
    expect(screen.getByText('Dock A')).toBeTruthy()
    expect(screen.getByText('Dock B')).toBeTruthy()
  })
})
