import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useModuleDisplaySupportMock, tMock } = vi.hoisted(() => ({
  useModuleDisplaySupportMock: vi.fn().mockReturnValue({
    formatCellValue: vi.fn((value: unknown, _type?: string) => String(value)),
  }),
  tMock: vi.fn((key: string) => key),
}))

vi.mock('@/hooks/useModuleDisplaySupport', () => ({
  useModuleDisplaySupport: useModuleDisplaySupportMock,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock }),
}))

vi.mock('@/components/StatusTag', () => ({
  StatusTag: ({ status }: { status: string }) =>
    `<StatusTag>${status}</StatusTag>`,
}))

vi.mock('@/components/TableActions', () => ({
  TableActions: ({ items }: { items: any[] }) =>
    `<TableActions>${items.length}</TableActions>`,
}))

import { ACTION_COLUMN_WIDTH, useGridColumns } from './useGridColumns'

describe('useGridColumns', () => {
  const defaultProps = {
    config: {
      columns: [
        { dataIndex: 'name', title: 'Name', type: 'string' },
        { dataIndex: 'status', title: 'Status', type: 'status' },
      ],
      statusMap: { pending: { color: 'orange', label: 'Pending' } },
    },
    rowActions: vi.fn().mockReturnValue([]),
    canUpdate: true,
    showActions: false,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    useModuleDisplaySupportMock.mockReturnValue({
      formatCellValue: vi.fn((value: unknown, _type?: string) => String(value)),
    })
  })

  it('returns columns array', () => {
    const { result } = renderHook(() => useGridColumns(defaultProps))
    expect(result.current.columns).toBeDefined()
    expect(Array.isArray(result.current.columns)).toBe(true)
  })

  it('includes actions column when canUpdate is true', () => {
    const { result } = renderHook(() => useGridColumns(defaultProps))
    const actionsColumn = result.current.columns.find(
      (col) => col.id === 'actions',
    )
    expect(actionsColumn).toBeDefined()
    expect(actionsColumn?.meta?.width).toBe(ACTION_COLUMN_WIDTH)
  })

  it('includes actions column when showActions is true', () => {
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, canUpdate: false, showActions: true }),
    )
    const actionsColumn = result.current.columns.find(
      (col) => col.id === 'actions',
    )
    expect(actionsColumn).toBeDefined()
  })

  it('does not include actions column when both canUpdate and showActions are false', () => {
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, canUpdate: false, showActions: false }),
    )
    const actionsColumn = result.current.columns.find(
      (col) => col.id === 'actions',
    )
    expect(actionsColumn).toBeUndefined()
  })

  it('creates columns from config', () => {
    const { result } = renderHook(() => useGridColumns(defaultProps))
    const dataColumns = result.current.columns.filter(
      (col) => col.id !== 'actions',
    )
    expect(dataColumns).toHaveLength(2)
    expect(dataColumns[0].id).toBe('name')
    expect(dataColumns[1].id).toBe('status')
  })

  it('sets column width correctly', () => {
    const { result } = renderHook(() => useGridColumns(defaultProps))
    const nameColumn = result.current.columns.find((col) => col.id === 'name')
    expect(nameColumn?.meta?.width).toBe('120px')
  })

  it('uses custom column width when provided', () => {
    const config = {
      columns: [{ dataIndex: 'name', title: 'Name', width: 200 }],
    }
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, config }),
    )
    const nameColumn = result.current.columns.find((col) => col.id === 'name')
    expect(nameColumn?.meta?.width).toBe('200px')
  })

  it('uses custom align when provided', () => {
    const config = {
      columns: [{ dataIndex: 'name', title: 'Name', align: 'left' }],
    }
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, config }),
    )
    const nameColumn = result.current.columns.find((col) => col.id === 'name')
    expect(nameColumn?.meta?.align).toBe('left')
  })

  it('defaults align to center', () => {
    const { result } = renderHook(() => useGridColumns(defaultProps))
    const nameColumn = result.current.columns.find((col) => col.id === 'name')
    expect(nameColumn?.meta?.align).toBe('center')
  })

  it('uses custom render function when provided', () => {
    const customRender = vi.fn().mockReturnValue('Custom')
    const config = {
      columns: [{ dataIndex: 'name', title: 'Name', render: customRender }],
      statusMap: {},
    }
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, config }),
    )
    const nameColumn = result.current.columns.find((col) => col.id === 'name')
    expect(nameColumn).toBeDefined()
  })

  it('renders status column with StatusTag', () => {
    const config = {
      columns: [
        { dataIndex: 'status', title: 'Status', type: 'status' as const },
      ],
      statusMap: { pending: { color: 'orange', label: 'Pending' } },
    }
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, config }),
    )
    const statusColumn = result.current.columns.find(
      (col) => col.id === 'status',
    )
    expect(statusColumn).toBeDefined()
  })

  it('renders value as text for non-status column type', () => {
    const config = {
      columns: [
        { dataIndex: 'amount', title: 'Amount', type: 'amount' as const },
      ],
    }
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, config }),
    )
    const amountColumn = result.current.columns.find(
      (col) => col.id === 'amount',
    )
    expect(amountColumn).toBeDefined()
  })

  it('handles empty config columns', () => {
    const config = { columns: [] }
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, config }),
    )
    const dataColumns = result.current.columns.filter(
      (col) => col.id !== 'actions',
    )
    expect(dataColumns).toHaveLength(0)
  })

  it('handles column without type', () => {
    const config = {
      columns: [{ dataIndex: 'name', title: 'Name' }],
    }
    const { result } = renderHook(() =>
      useGridColumns({ ...defaultProps, config }),
    )
    const nameColumn = result.current.columns.find((col) => col.id === 'name')
    expect(nameColumn).toBeDefined()
  })

  it('returns export constant ACTION_COLUMN_WIDTH', () => {
    expect(ACTION_COLUMN_WIDTH).toBe(155)
  })
})
