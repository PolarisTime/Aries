import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('antd', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Spin: ({ children, spinning, ...props }: any) => (
    <div data-spinning={String(Boolean(spinning))} {...props}>
      {children}
    </div>
  ),
  Table: ({ columns, dataSource, rowKey }: any) => (
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
  Typography: {
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('antd/es/card', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/spin', () => ({
  default: ({ children, spinning, ...props }: any) => (
    <div data-spinning={String(Boolean(spinning))} {...props}>
      {children}
    </div>
  ),
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

import { useQuery } from '@tanstack/react-query'
import { getBusinessModuleDetail } from '@/api/business'
import { QUERY_KEYS } from '@/constants/query-keys'
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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never)
    vi.mocked(QUERY_KEYS.freightPickup).mockReturnValue(['freight-pickup'])
  })

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

  it('configures and executes detail query for selected records', async () => {
    vi.mocked(getBusinessModuleDetail)
      .mockResolvedValueOnce({ data: { id: 'full-1', billNo: 'FULL-001' } })
      .mockResolvedValueOnce({ data: { id: 'full-2', billNo: 'FULL-002' } })

    render(
      <ModuleFreightPickupListOverlay
        {...defaultProps}
        records={[
          { id: 101, billNo: 'FB-101' },
          { id: '102', billNo: 'FB-102' },
        ]}
      />,
    )

    const queryOptions = vi.mocked(useQuery).mock.calls.at(-1)?.[0] as any
    expect(QUERY_KEYS.freightPickup).toHaveBeenCalledWith('freight-bill')
    expect(queryOptions).toEqual(
      expect.objectContaining({
        enabled: true,
        queryKey: ['freight-pickup', '101', '102'],
      }),
    )
    await expect(queryOptions.queryFn()).resolves.toEqual([
      { id: 'full-1', billNo: 'FULL-001' },
      { id: 'full-2', billNo: 'FULL-002' },
    ])
    expect(getBusinessModuleDetail).toHaveBeenNthCalledWith(
      1,
      'freight-bill',
      '101',
    )
    expect(getBusinessModuleDetail).toHaveBeenNthCalledWith(
      2,
      'freight-bill',
      '102',
    )
  })

  it('uses loaded full records and passes loading state to the spinner', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [
        {
          id: 'full',
          billNo: 'FULL-003',
          carrierName: 'Loaded Carrier',
          vehiclePlate: 'LOADED-1',
          totalWeight: 1.2,
          totalFreight: 34.5,
          items: [],
        },
      ],
      isLoading: true,
    } as never)

    render(<ModuleFreightPickupListOverlay {...defaultProps} />)

    expect(screen.getByText(/FULL-003/)).toBeTruthy()
    expect(screen.getByText(/Loaded Carrier/)).toBeTruthy()
    expect(screen.queryByText(/FB-001/)).toBeNull()
    expect(
      screen.getByTestId('overlay').querySelector('[data-spinning="true"]'),
    ).toBeTruthy()
  })

  it('disables detail query when there are no records', () => {
    render(<ModuleFreightPickupListOverlay {...defaultProps} records={[]} />)

    const queryOptions = vi.mocked(useQuery).mock.calls.at(-1)?.[0] as any
    expect(queryOptions).toEqual(
      expect.objectContaining({
        enabled: false,
        queryKey: ['freight-pickup'],
      }),
    )
  })

  it('renders fallback values and appends items to an existing project group', () => {
    render(
      <ModuleFreightPickupListOverlay
        {...defaultProps}
        records={[
          {
            id: 'fallbacks',
            billNo: null,
            carrierName: undefined,
            vehiclePlate: null,
            totalWeight: null,
            totalFreight: undefined,
            projectName: ' Fallback Project ',
            items: [
              {
                id: 'same-project-1',
                projectName: '',
                warehouseName: '   ',
                brand: 'Brand A',
                material: 'Q235',
                spec: '10#',
                length: '12m',
                quantity: 1,
                weightTon: null,
              },
              {
                id: 'same-project-2',
                projectName: null,
                warehouseName: null,
                brand: 'Brand B',
                material: 'Q355',
                spec: '12#',
                length: '9m',
                quantity: 2,
                weightTon: undefined,
              },
            ],
          },
        ]}
      />,
    )

    expect(screen.getAllByText('Fallback Project')).toHaveLength(1)
    expect(screen.getByText('Brand A')).toBeTruthy()
    expect(screen.getByText('Brand B')).toBeTruthy()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(7)
  })

  it('renders records whose items field is not an array', () => {
    render(
      <ModuleFreightPickupListOverlay
        {...defaultProps}
        records={[
          {
            id: 'without-items',
            billNo: 'FB-NO-ITEMS',
            carrierName: 'Carrier B',
            vehiclePlate: 'NOITEM-1',
            totalWeight: 0,
            totalFreight: 0,
            items: null,
          },
        ]}
      />,
    )

    expect(screen.getByText(/FB-NO-ITEMS/)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
