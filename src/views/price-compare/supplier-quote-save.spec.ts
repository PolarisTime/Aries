import { describe, expect, it, vi } from 'vitest'
import type { ColumnSavePlan } from './supplier-price-list-model'

const priceApi = vi.hoisted(() => ({
  addSupplierPriceColumn: vi.fn(),
  saveSupplierPriceColumnItems: vi.fn(),
}))

vi.mock('@/api/market/supplier-price-lists', () => priceApi)

import { persistColumnPlans } from './supplier-quote-save'

const plan = (overrides: Partial<ColumnSavePlan> = {}): ColumnSavePlan => ({
  brandName: '中天',
  column: {
    listId: 'l1',
    supplierId: 's1',
    supplierName: '浙江铁都',
    quotedOn: '2026-10-23',
    updatedAt: null,
    warehouse: null,
    version: 3,
  },
  items: [
    {
      category: '螺纹钢',
      material: 'HRB400',
      spec: 12,
      length: '9米',
      price: 3280,
    },
  ],
  ...overrides,
})

const createdColumn = {
  listId: 'l2',
  supplierId: 's1',
  supplierName: '浙江铁都',
  quotedOn: null,
  updatedAt: null,
  warehouse: null,
  version: 0,
}

describe('persistColumnPlans：顺序保存各品牌列', () => {
  it('既有列：直接提交条目，成功后回调', async () => {
    priceApi.saveSupplierPriceColumnItems.mockReset().mockResolvedValue({})
    const onPlanSaved = vi.fn()
    const onPlanFailed = vi.fn()

    const result = await persistColumnPlans({
      supplierId: 's1',
      quotedOn: '2026-10-23',
      plans: [plan()],
      onPlanSaved,
      onPlanFailed,
    })

    expect(priceApi.addSupplierPriceColumn).not.toHaveBeenCalled()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      plan().items,
    )
    expect(onPlanSaved).toHaveBeenCalledWith('中天')
    expect(onPlanFailed).not.toHaveBeenCalled()
    expect(result).toEqual({ saved: 1, failed: [] })
  })

  it('新列：先建列、再用返回的版本号提交条目', async () => {
    priceApi.addSupplierPriceColumn.mockReset().mockResolvedValue(createdColumn)
    priceApi.saveSupplierPriceColumnItems.mockReset().mockResolvedValue({})

    const result = await persistColumnPlans({
      supplierId: 's1',
      quotedOn: '2026-10-28',
      plans: [plan({ column: null })],
      onPlanSaved: vi.fn(),
      onPlanFailed: vi.fn(),
    })

    expect(priceApi.addSupplierPriceColumn).toHaveBeenCalledWith({
      brandName: '中天',
      supplierId: 's1',
      quotedOn: '2026-10-28',
    })
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l2',
      0,
      plan().items,
    )
    expect(result.saved).toBe(1)
  })

  it('单列失败不影响后续列，失败列带 createdColumn 标记回调', async () => {
    priceApi.addSupplierPriceColumn.mockReset().mockResolvedValue(createdColumn)
    priceApi.saveSupplierPriceColumnItems
      .mockReset()
      .mockRejectedValueOnce(new Error('409'))
      .mockResolvedValueOnce({})

    const onPlanSaved = vi.fn()
    const onPlanFailed = vi.fn()
    const result = await persistColumnPlans({
      supplierId: 's1',
      quotedOn: '2026-10-28',
      plans: [
        plan({ brandName: '中天', column: null }),
        plan({ brandName: '永钢', column: plan().column }),
      ],
      onPlanSaved,
      onPlanFailed,
    })

    expect(result).toEqual({ saved: 1, failed: ['中天'] })
    expect(onPlanFailed).toHaveBeenCalledWith('中天', true)
    expect(onPlanSaved).toHaveBeenCalledWith('永钢')
  })

  it('刷新回调自身抛错不会被算成保存失败', async () => {
    priceApi.saveSupplierPriceColumnItems.mockReset().mockResolvedValue({})
    const result = await persistColumnPlans({
      supplierId: 's1',
      quotedOn: '2026-10-23',
      plans: [plan()],
      onPlanSaved: () => {
        throw new Error('刷新失败')
      },
      onPlanFailed: vi.fn(),
    })

    expect(result).toEqual({ saved: 1, failed: [] })
  })
})
