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
})
