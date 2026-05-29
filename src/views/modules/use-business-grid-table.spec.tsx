import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { useBusinessGridTable } from './use-business-grid-table'

vi.mock('@/utils/antd-app', () => ({
  message: {
    warning: vi.fn(),
  },
}))

const config = {
  key: 'sales-order',
  title: '销售订单',
  kicker: '',
  description: '',
  filters: [],
  columns: [
    { title: '订单号', dataIndex: 'orderNo', width: 160 },
    { title: '客户', dataIndex: 'customerName', width: 180 },
  ],
  detailFields: [],
  data: [],
  buildOverview: () => [],
} satisfies ModulePageConfig

function useTestBusinessGridTable(currentConfig: ModulePageConfig | undefined) {
  return useBusinessGridTable({
    moduleKey: 'sales-order',
    config: currentConfig,
    records: [],
    canUpdateRecord: true,
    selectedRowKeys: [],
    setSelectedRowKeys: vi.fn(),
    setSelectedRowMap: vi.fn(),
    buildActions: () => [],
    showActions: true,
    sorting: [],
    onSortingChange: vi.fn(),
  })
}

describe('useBusinessGridTable', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('does not cache an action-only column before config is ready', () => {
    const { result, rerender } = renderHook(
      ({ currentConfig }: { currentConfig: ModulePageConfig | undefined }) =>
        useTestBusinessGridTable(currentConfig),
      { initialProps: { currentConfig: undefined } },
    )

    expect(result.current.antdColumns.map((column) => column.key)).toEqual([])

    rerender({ currentConfig: config })

    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'actions',
      'orderNo',
      'customerName',
    ])
  })

  it('keeps the action column first while applying saved column order', () => {
    window.localStorage.setItem(
      'aries-list-column-settings:anonymous:sales-order',
      JSON.stringify({
        orderedKeys: ['customerName', 'actions', 'orderNo'],
        hiddenKeys: [],
      }),
    )

    const { result } = renderHook(() => useTestBusinessGridTable(config))

    expect(result.current.antdColumns.map((column) => column.key)).toEqual([
      'actions',
      'customerName',
      'orderNo',
    ])
  })
})
