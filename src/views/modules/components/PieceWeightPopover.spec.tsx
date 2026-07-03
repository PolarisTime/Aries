import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  assertApiSuccess: vi.fn(),
  httpGet: vi.fn(),
  latestQueryOptions: undefined as any,
  useQuery: vi.fn((options: any) => {
    mocks.latestQueryOptions = options
    return {
      data: [],
      isError: false,
      isFetching: false,
    }
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}))

vi.mock('antd', () => ({
  Popover: ({
    children,
    content,
    open,
    onOpenChange,
    title,
    trigger: _trigger,
    overlayStyle: _overlayStyle,
  }: any) => (
    <div data-testid="popover-root">
      <button type="button" onClick={() => onOpenChange?.(!open)}>
        toggle
      </button>
      <div data-testid="popover-title">{title}</div>
      {children}
      {open ? <div data-testid="popover-content">{content}</div> : null}
    </div>
  ),
  Table: ({ columns, dataSource }: any) => (
    <table data-testid="piece-table">
      <tbody>
        {dataSource.map((record: any) => (
          <tr key={record.pieceNo}>
            {columns.map((column: any) => {
              const value = record[column.dataIndex]
              return (
                <td key={column.dataIndex}>
                  {column.render ? column.render(value, record) : value}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: mocks.assertApiSuccess,
  http: {
    get: mocks.httpGet,
  },
}))

import { PieceWeightPopover } from '@/views/modules/components/PieceWeightPopover'

describe('PieceWeightPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.latestQueryOptions = undefined
    mocks.useQuery.mockImplementation((options: any) => {
      mocks.latestQueryOptions = options
      return {
        data: [],
        isError: false,
        isFetching: false,
      }
    })
  })

  it('renders plain formatted numeric weight for non-weigh category', () => {
    render(<PieceWeightPopover itemId="1" weightTon={1.234} category="钢材" />)

    expect(screen.getByText('1.234')).toBeTruthy()
    expect(screen.queryByTestId('popover-root')).toBeNull()
    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['piece-weights', 'purchase-order-item', '1'],
      }),
    )
  })

  it('renders plain string weight when lookup is unavailable and fallback is disabled', () => {
    render(
      <PieceWeightPopover
        itemId=" M-001|一号仓|B-001 "
        weightTon="3.5"
        category="线材"
        allowItemIdFallback={false}
      />,
    )

    expect(screen.getByText('3.5')).toBeTruthy()
    expect(screen.queryByTestId('popover-root')).toBeNull()
    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['piece-weights', 'purchase-order-item', ''],
      }),
    )
  })

  it('opens and closes the popover while enabling purchase-order lookup', () => {
    render(<PieceWeightPopover itemId={12} weightTon={2.5} category="盘螺" />)

    expect(screen.getByText('2.500')).toBeTruthy()
    expect(mocks.latestQueryOptions).toEqual(
      expect.objectContaining({
        enabled: false,
        queryKey: ['piece-weights', 'purchase-order-item', '12'],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.getByTestId('popover-content')).toHaveTextContent(
      'modules.pieceWeight.noData',
    )
    expect(mocks.latestQueryOptions).toEqual(
      expect.objectContaining({
        enabled: true,
        queryKey: ['piece-weights', 'purchase-order-item', '12'],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.queryByTestId('popover-content')).toBeNull()
    expect(mocks.latestQueryOptions).toEqual(
      expect.objectContaining({
        enabled: false,
      }),
    )
  })

  it('uses sales-order lookup first and executes the query function', async () => {
    const response = {
      code: 0,
      data: [{ pieceNo: 1, weightTon: 1.25, salesOrderNo: 'SO-1' }],
    }
    mocks.httpGet.mockResolvedValueOnce(response)

    render(
      <PieceWeightPopover
        itemId="po-1"
        inboundItemId=" inbound-1 "
        purchaseOrderItemId="po-item-1"
        salesOrderItemId=" so item/1 "
        weightTon={1.25}
        category="线材"
      />,
    )

    expect(mocks.latestQueryOptions.queryKey).toEqual([
      'piece-weights',
      'sales-order-item',
      'so item/1',
    ])

    await expect(mocks.latestQueryOptions.queryFn()).resolves.toEqual(
      response.data,
    )
    expect(mocks.httpGet).toHaveBeenCalledWith(
      '/purchase-orders/items/piece-weights/by-sales-order-item?salesOrderItemId=so%20item%2F1',
    )
    expect(mocks.assertApiSuccess).toHaveBeenCalledWith(
      response,
      'modules.pieceWeight.loadFailed',
    )
  })

  it('falls back to an empty array when the API response has no data', async () => {
    const response = { code: 0 }
    mocks.httpGet.mockResolvedValueOnce(response)

    render(
      <PieceWeightPopover
        itemId="po-1"
        inboundItemId="inbound-1"
        weightTon={1.25}
        category="线材"
      />,
    )

    expect(mocks.latestQueryOptions.queryKey).toEqual([
      'piece-weights',
      'purchase-inbound-item',
      'inbound-1',
    ])
    await expect(mocks.latestQueryOptions.queryFn()).resolves.toEqual([])
    expect(mocks.httpGet).toHaveBeenCalledWith(
      '/purchase-inbounds/items/inbound-1/piece-weights',
    )
  })

  it('renders loading and error content branches', () => {
    mocks.useQuery.mockImplementation((options: any) => {
      mocks.latestQueryOptions = options
      return { data: [], isError: false, isFetching: true }
    })
    const { rerender } = render(
      <PieceWeightPopover
        itemId="po-1"
        purchaseOrderItemId="po-item-1"
        weightTon={4}
        category="盘螺"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.getByTestId('popover-content')).toHaveTextContent(
      'modules.pieceWeight.loading',
    )

    mocks.useQuery.mockImplementation((options: any) => {
      mocks.latestQueryOptions = options
      return { data: [], isError: true, isFetching: false }
    })
    rerender(
      <PieceWeightPopover
        itemId="po-1"
        purchaseOrderItemId="po-item-1"
        weightTon={4}
        category="盘螺"
      />,
    )

    expect(screen.getByTestId('popover-content')).toHaveTextContent(
      'modules.pieceWeight.loadFailed',
    )
  })

  it('renders piece rows, computed title total, and formatted cell weights', () => {
    mocks.useQuery.mockImplementation((options: any) => {
      mocks.latestQueryOptions = options
      return {
        data: [
          { pieceNo: 1, weightTon: 1.2, salesOrderNo: 'SO-1' },
          { pieceNo: 2, weightTon: 2.3456, salesOrderNo: 'SO-2' },
        ],
        isError: false,
        isFetching: false,
      }
    })

    render(
      <PieceWeightPopover
        itemId="po-1"
        purchaseOrderItemId=" po item/2 "
        weightTon="3.5456"
        category="线材"
      />,
    )

    expect(screen.getByText('3.5456')).toBeTruthy()
    expect(screen.getByTestId('popover-title')).toHaveTextContent(
      'modules.pieceWeight.detailTitle:{"count":2,"weight":"3.546"}',
    )
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expect(screen.getByTestId('piece-table')).toBeTruthy()
    expect(screen.getByText('1.200')).toBeTruthy()
    expect(screen.getByText('2.346')).toBeTruthy()
    expect(screen.getByText('SO-1')).toBeTruthy()
    expect(mocks.latestQueryOptions.queryKey).toEqual([
      'piece-weights',
      'purchase-order-item',
      'po item/2',
    ])
  })
})
