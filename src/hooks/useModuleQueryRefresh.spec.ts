import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useQueryClientMock,
  invalidateQueriesMock,
  setQueryDataMock,
  reloadMasterOptionsForModuleMock,
} = vi.hoisted(() => ({
  useQueryClientMock: vi.fn(),
  invalidateQueriesMock: vi.fn().mockResolvedValue(undefined),
  setQueryDataMock: vi.fn(),
  reloadMasterOptionsForModuleMock: vi.fn().mockResolvedValue([{ value: 'A' }]),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: useQueryClientMock,
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    businessGrid: vi.fn((key: string) => ['businessGrid', key]),
    businessGridAll: vi.fn((key: string) => ['businessGridAll', key]),
    parentSelectorListBase: ['parent-selector-list'],
    statementLinkOptionsBase: ['statement-link-options'],
    masterOptions: {
      customer: ['master-options', 'customer'],
    },
  },
}))

vi.mock('@/hooks/master-option-cache-refresh', () => ({
  getMasterOptionQueryKey: vi.fn((moduleKey: string) =>
    moduleKey === 'customer' ? ['master-options', 'customer'] : undefined,
  ),
  reloadMasterOptionsForModule: reloadMasterOptionsForModuleMock,
}))

import { useModuleQueryRefresh } from './useModuleQueryRefresh'

describe('useModuleQueryRefresh', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reloadMasterOptionsForModuleMock.mockResolvedValue([{ value: 'A' }])
    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
      setQueryData: setQueryDataMock,
    })
  })

  it('returns refreshModuleQueries function', () => {
    const { result } = renderHook(() => useModuleQueryRefresh('sales-order'))
    expect(result.current.refreshModuleQueries).toBeDefined()
  })

  it('invalidates businessGrid query', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('sales-order'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['businessGrid', 'sales-order'],
    })
  })

  it('invalidates businessGridAll query', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('sales-order'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['businessGridAll', 'sales-order'],
    })
  })

  it('invalidates both queries in parallel', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('sales-order'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledTimes(4)
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['parent-selector-list'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['statement-link-options'],
    })
  })

  it('refreshes master option cache for master data modules', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('customer'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(reloadMasterOptionsForModuleMock).toHaveBeenCalledWith('customer')
    expect(setQueryDataMock).toHaveBeenCalledWith(
      ['master-options', 'customer'],
      [{ value: 'A' }],
    )
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['master-options', 'customer'],
    })
  })

  it('uses correct module key', async () => {
    const { result } = renderHook(() => useModuleQueryRefresh('purchase-order'))
    await act(async () => {
      await result.current.refreshModuleQueries()
    })

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['businessGrid', 'purchase-order'],
    })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['businessGridAll', 'purchase-order'],
    })
  })
})
