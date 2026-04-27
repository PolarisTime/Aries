import { businessPageConfigs } from '@/config/business-pages'
import {
  buildGlobalSearchSummary,
  searchAccessibleModules,
} from '@/layouts/global-search'

describe('searchAccessibleModules', () => {
  it('only searches modules that the current user can access', async () => {
    const searchModule = vi.fn(async (moduleKey: string) => ({
      data: {
        rows: [{
          id: `${moduleKey}-1`,
          orderNo: `${moduleKey}-NO`,
          status: '已审核',
        }],
      },
    }))

    const results = await searchAccessibleModules({
      keyword: 'NO',
      moduleKeys: ['purchase-orders', 'sales-orders'],
      pageConfigs: businessPageConfigs,
      canAccessModule: (moduleKey) => moduleKey === 'purchase-orders',
      searchModule,
      buildSummary: (record) => String(record.status || ''),
    })

    expect(searchModule).toHaveBeenCalledTimes(1)
    expect(searchModule).toHaveBeenCalledWith('purchase-orders', 'NO')
    expect(results).toHaveLength(1)
    expect(results[0]?.moduleKey).toBe('purchase-orders')
  })

  it('ignores per-module request failures instead of failing the whole search', async () => {
    const searchModule = vi.fn(async (moduleKey: string) => {
      if (moduleKey === 'sales-orders') {
        throw new Error('403 Forbidden')
      }

      return {
        data: {
          rows: [{
            id: 'purchase-order-1',
            orderNo: 'CG20260001',
            customerName: '测试客户',
          }],
        },
      }
    })

    const results = await searchAccessibleModules({
      keyword: 'CG20260001',
      moduleKeys: ['purchase-orders', 'sales-orders'],
      pageConfigs: businessPageConfigs,
      canAccessModule: () => true,
      searchModule,
      buildSummary: (record) => String(record.customerName || ''),
    })

    expect(searchModule).toHaveBeenCalledTimes(2)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      moduleKey: 'purchase-orders',
      primaryNo: 'CG20260001',
    })
  })

  it('builds a stable summary from common backend business fields', () => {
    expect(
      buildGlobalSearchSummary({
        id: 'purchase-order-1',
        customerName: '客户甲',
        supplierName: '供应商乙',
        projectName: '项目丙',
        carrierName: '物流丁',
        status: '已审核',
      }),
    ).toBe('客户甲 / 供应商乙 / 项目丙')
  })
})
