import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchModulePage: vi.fn(),
}))

vi.mock('@/api/business/business-listing-fetch', () => ({
  fetchModulePage: mocks.fetchModulePage,
}))

import { fetchDashboardRecentDocuments } from './dashboard-recent'

describe('工作台最近单据排序参数', () => {
  beforeEach(() => {
    mocks.fetchModulePage.mockReset()
    mocks.fetchModulePage.mockResolvedValue({ rows: [] })
  })

  it('客户对账单排序方向使用 direction', async () => {
    await fetchDashboardRecentDocuments('customer-statement')
    expect(mocks.fetchModulePage).toHaveBeenCalledWith(
      'customer-statement',
      { sortBy: 'endDate', direction: 'desc' },
      0,
      5,
    )
  })

  it('其余模块仍使用 direction 作为排序方向', async () => {
    await fetchDashboardRecentDocuments('purchase-order')
    expect(mocks.fetchModulePage).toHaveBeenCalledWith(
      'purchase-order',
      { sortBy: 'orderDate', direction: 'desc' },
      0,
      5,
    )
  })
})
