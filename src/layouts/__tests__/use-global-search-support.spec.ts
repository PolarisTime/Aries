import { beforeEach, describe, expect, it, vi } from 'vitest'
import { businessPageConfigs } from '@/config/business-pages'
import { useGlobalSearchSupport } from '@/layouts/use-global-search-support'

describe('useGlobalSearchSupport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('searches only accessible modules and routes to the selected result', async () => {
    const router = {
      push: vi.fn(),
    }
    const searchModule = vi.fn(async (moduleKey: string) => ({
      data: {
        rows: [
          {
            id: `${moduleKey}-1`,
            orderNo: 'CG20260001',
            status: '已审核',
          },
        ],
      },
    }))

    const support = useGlobalSearchSupport({
      moduleKeys: ['purchase-orders', 'sales-orders'],
      pageConfigs: businessPageConfigs,
      router,
      canAccessModule: (moduleKey) => moduleKey === 'purchase-orders',
      searchModule,
      buildSummary: (record) => String(record.status || ''),
    })

    await support.handleSearch('CG20260001')

    expect(searchModule).toHaveBeenCalledTimes(1)
    expect(searchModule).toHaveBeenCalledWith('purchase-orders', 'CG20260001')
    expect(support.resultOptions.value).toHaveLength(1)

    support.handleSelect('purchase-orders::CG20260001')

    expect(router.push).toHaveBeenCalledWith({
      path: '/purchase-orders',
      query: {
        docNo: 'CG20260001',
        trackId: 'purchase-orders-1',
        openDetail: '1',
      },
    })
    expect(support.results.value).toEqual([])
  })

  it('jumps directly when submit finds an exact primary number match', async () => {
    const router = {
      push: vi.fn(),
    }
    const searchModule = vi.fn(async () => ({
      data: {
        rows: [
          {
            id: 'purchase-order-1',
            orderNo: 'CG20260001',
            status: '已审核',
          },
          {
            id: 'purchase-order-2',
            orderNo: 'CG20260002',
            status: '待审核',
          },
        ],
      },
    }))

    const support = useGlobalSearchSupport({
      moduleKeys: ['purchase-orders'],
      pageConfigs: businessPageConfigs,
      router,
      canAccessModule: () => true,
      searchModule,
      buildSummary: (record) => String(record.status || ''),
    })

    await support.handleSubmit('CG20260001')

    expect(searchModule).toHaveBeenCalledWith('purchase-orders', 'CG20260001')
    expect(router.push).toHaveBeenCalledWith({
      path: '/purchase-orders',
      query: {
        docNo: 'CG20260001',
        trackId: 'purchase-order-1',
        openDetail: '1',
      },
    })
    expect(support.results.value).toEqual([])
  })

  it('can look up and route by trackId', async () => {
    const router = {
      push: vi.fn(),
    }
    const searchModule = vi.fn(async () => ({
      data: {
        rows: [],
      },
    }))
    const lookupRecordById = vi.fn(async () => ({
      id: '1914876201459236001',
      orderNo: 'CG20260001',
      status: '已审核',
    }))

    const support = useGlobalSearchSupport({
      moduleKeys: ['purchase-orders'],
      pageConfigs: businessPageConfigs,
      router,
      canAccessModule: () => true,
      searchModule,
      lookupRecordById,
      buildSummary: (record) => String(record.status || ''),
    })

    await support.handleSubmit('1914876201459236001')

    expect(searchModule).toHaveBeenCalledWith('purchase-orders', '1914876201459236001')
    expect(lookupRecordById).toHaveBeenCalledWith('purchase-orders', '1914876201459236001')
    expect(router.push).toHaveBeenCalledWith({
      path: '/purchase-orders',
      query: {
        docNo: 'CG20260001',
        trackId: '1914876201459236001',
        openDetail: '1',
      },
    })
  })
})
