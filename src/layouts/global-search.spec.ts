import { describe, expect, it } from 'vitest'
import {
  buildGlobalSearchSummary,
  searchAccessibleModules,
} from '@/layouts/global-search'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

const testPageConfigs: Record<string, ModulePageConfig> = {
  'purchase-order': {
    key: 'purchase-order',
    title: '采购订单',
    kicker: '',
    description: '',
    primaryNoKey: 'orderNo',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  },
  'sales-order': {
    key: 'sales-order',
    title: '销售订单',
    kicker: '',
    description: '',
    primaryNoKey: 'orderNo',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  },
}

describe('buildGlobalSearchSummary', () => {
  it('joins first available summary fields', () => {
    expect(
      buildGlobalSearchSummary({
        id: '1',
        customerName: '甲方',
        supplierName: '乙方',
        status: '待审核',
      } satisfies ModuleRecord),
    ).toBe('甲方 / 乙方 / 待审核')
  })
})

describe('searchAccessibleModules', () => {
  it('filters inaccessible modules and deduplicates lookup results', async () => {
    const purchaseRecord = {
      id: '1001',
      orderNo: 'PO-001',
      supplierName: '钢材供应商',
    } satisfies ModuleRecord

    const results = await searchAccessibleModules({
      keyword: '1001',
      moduleKeys: ['purchase-order', 'sales-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: (moduleKey) => moduleKey !== 'sales-order',
      searchModule: () =>
        Promise.resolve({
          data: { rows: [purchaseRecord] },
        }),
      lookupRecordById: () => Promise.resolve(purchaseRecord),
      buildSummary: buildGlobalSearchSummary,
    })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      value: 'purchase-order::1001',
      moduleKey: 'purchase-order',
      primaryNo: 'PO-001',
      trackId: '1001',
      matchedByTrackId: true,
    })
  })

  it('returns empty array for empty keyword', async () => {
    const results = await searchAccessibleModules({
      keyword: '   ',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: vi.fn(),
      buildSummary: buildGlobalSearchSummary,
    })
    expect(results).toEqual([])
  })

  it('skips modules without page config', async () => {
    const searchModule = vi.fn()
    const results = await searchAccessibleModules({
      keyword: 'test',
      moduleKeys: ['unknown-module'],
      pageConfigs: {},
      canAccessModule: () => true,
      searchModule,
      buildSummary: buildGlobalSearchSummary,
    })
    expect(results).toEqual([])
    expect(searchModule).not.toHaveBeenCalled()
  })

  it('continues when searchModule throws error', async () => {
    const results = await searchAccessibleModules({
      keyword: 'test',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => Promise.reject(new Error('Network error')),
      buildSummary: buildGlobalSearchSummary,
    })
    expect(results).toEqual([])
  })

  it('deduplicates records by id', async () => {
    const record = {
      id: '1001',
      orderNo: 'PO-001',
    } satisfies ModuleRecord

    const results = await searchAccessibleModules({
      keyword: '1001',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () =>
        Promise.resolve({
          data: { rows: [record, record] },
        }),
      buildSummary: buildGlobalSearchSummary,
    })

    expect(results).toHaveLength(1)
  })

  it('sorts results by primaryNo', async () => {
    const record1 = { id: '1', orderNo: 'B-001' } satisfies ModuleRecord
    const record2 = { id: '2', orderNo: 'A-002' } satisfies ModuleRecord

    const results = await searchAccessibleModules({
      keyword: 'test',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () =>
        Promise.resolve({
          data: { rows: [record1, record2] },
        }),
      buildSummary: buildGlobalSearchSummary,
    })

    expect(results).toHaveLength(2)
    expect(results[0].primaryNo).toBe('A-002')
    expect(results[1].primaryNo).toBe('B-001')
  })

  it('limits results to 20 items', async () => {
    const records = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      orderNo: `ORD-${String(i + 1).padStart(3, '0')}`,
    })) satisfies ModuleRecord[]

    const results = await searchAccessibleModules({
      keyword: 'test',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () =>
        Promise.resolve({
          data: { rows: records },
        }),
      buildSummary: buildGlobalSearchSummary,
    })

    expect(results).toHaveLength(20)
  })

  it('handles missing data.rows in response', async () => {
    const results = await searchAccessibleModules({
      keyword: 'test',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => Promise.resolve({ data: undefined }),
      buildSummary: buildGlobalSearchSummary,
    })
    expect(results).toEqual([])
  })

  it('handles outer catch when searchAccessibleModules throws', async () => {
    const results = await searchAccessibleModules({
      keyword: 'test',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => {
        throw new Error('Sync error')
      },
      buildSummary: buildGlobalSearchSummary,
    })
    expect(results).toEqual([])
  })

  it('skips lookupRecordById when keyword is not a trackId', async () => {
    const lookupRecordById = vi.fn()
    const record = { id: '1001', orderNo: 'PO-001' } satisfies ModuleRecord

    const results = await searchAccessibleModules({
      keyword: 'PO-001',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => Promise.resolve({ data: { rows: [record] } }),
      lookupRecordById,
      buildSummary: buildGlobalSearchSummary,
    })

    expect(lookupRecordById).not.toHaveBeenCalled()
    expect(results).toHaveLength(1)
  })

  it.skip('uses lookupRecordById for trackId-like keywords', async () => {
    const record = {
      id: '123456789012',
      orderNo: 'PO-001',
    } satisfies ModuleRecord
    const lookupRecordById = vi.fn().mockResolvedValue(record)

    const results = await searchAccessibleModules({
      keyword: '123456789012',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => Promise.resolve({ data: { rows: [] } }),
      lookupRecordById,
      buildSummary: buildGlobalSearchSummary,
    })

    expect(lookupRecordById).toHaveBeenCalledWith(
      'purchase-order',
      '123456789012',
    )
    expect(results).toHaveLength(1)
  })

  it('ignores lookupRecordById errors', async () => {
    const results = await searchAccessibleModules({
      keyword: '123456789012',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => Promise.resolve({ data: { rows: [] } }),
      lookupRecordById: () => Promise.reject(new Error('Not found')),
      buildSummary: buildGlobalSearchSummary,
    })
    expect(results).toEqual([])
  })

  it('handles record without id', async () => {
    const record = { orderNo: 'PO-001' } satisfies ModuleRecord

    const results = await searchAccessibleModules({
      keyword: 'PO-001',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => Promise.resolve({ data: { rows: [record] } }),
      buildSummary: buildGlobalSearchSummary,
    })

    expect(results).toHaveLength(1)
  })

  it('includes matchedByTrackId when trackId equals keyword', async () => {
    const record = {
      id: '999',
      orderNo: 'PO-001',
    } satisfies ModuleRecord

    const results = await searchAccessibleModules({
      keyword: '999',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => Promise.resolve({ data: { rows: [record] } }),
      buildSummary: buildGlobalSearchSummary,
    })

    expect(results[0].matchedByTrackId).toBe(true)
    expect(results[0].trackId).toBe('999')
  })

  it('includes id text when trackId differs from primaryNo', async () => {
    const record = {
      id: '999',
      orderNo: 'PO-001',
    } satisfies ModuleRecord

    const results = await searchAccessibleModules({
      keyword: '999',
      moduleKeys: ['purchase-order'],
      pageConfigs: testPageConfigs,
      canAccessModule: () => true,
      searchModule: () => Promise.resolve({ data: { rows: [record] } }),
      buildSummary: buildGlobalSearchSummary,
    })

    expect(results[0].label).toContain('ID 999')
  })
})
