import { describe, expect, it, vi } from 'vitest'

const {
  fetchMaterialSearchMock,
  reloadCarrierOptionsMock,
  reloadSettlementCompanyOptionsMock,
  reloadCustomerOptionsMock,
  reloadMaterialCategoriesMock,
  reloadSupplierOptionsMock,
  reloadWarehouseOptionsMock,
  replaceMaterialCategoryOptionsMock,
} = vi.hoisted(() => ({
  fetchMaterialSearchMock: vi.fn(),
  reloadCarrierOptionsMock: vi.fn(),
  reloadSettlementCompanyOptionsMock: vi.fn(),
  reloadCustomerOptionsMock: vi.fn(),
  reloadMaterialCategoriesMock: vi.fn(),
  reloadSupplierOptionsMock: vi.fn(),
  reloadWarehouseOptionsMock: vi.fn(),
  replaceMaterialCategoryOptionsMock: vi.fn(),
}))

vi.mock('@/api/carrier-options', () => ({
  reloadCarrierOptions: reloadCarrierOptionsMock,
}))
vi.mock('@/api/company-settings', () => ({
  reloadSettlementCompanyOptions: reloadSettlementCompanyOptionsMock,
}))
vi.mock('@/api/customer-options', () => ({
  reloadCustomerOptions: reloadCustomerOptionsMock,
}))
vi.mock('@/api/material-categories', () => ({
  reloadMaterialCategories: reloadMaterialCategoriesMock,
}))
vi.mock('@/api/materials', () => ({
  fetchMaterialSearch: fetchMaterialSearchMock,
}))
vi.mock('@/api/option-resolvers', () => ({
  replaceMaterialCategoryOptions: replaceMaterialCategoryOptionsMock,
}))
vi.mock('@/api/supplier-options', () => ({
  reloadSupplierOptions: reloadSupplierOptionsMock,
}))
vi.mock('@/api/warehouse-options', () => ({
  reloadWarehouseOptions: reloadWarehouseOptionsMock,
}))
vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    masterOptions: {
      carrier: ['master-options', 'carrier'],
      customer: ['master-options', 'customer'],
      material: ['master-options', 'material'],
      materialCategories: ['master-options', 'material-categories'],
      settlementCompany: ['master-options', 'settlement-company'],
      supplier: ['master-options', 'supplier'],
      warehouse: ['master-options', 'warehouse'],
    },
  },
}))

import {
  getMasterOptionQueryKey,
  reloadMasterOptionsForModule,
} from './master-option-cache-refresh'

describe('master-option-cache-refresh', () => {
  it('resolves master option query keys', () => {
    expect(getMasterOptionQueryKey('customer')).toEqual([
      'master-options',
      'customer',
    ])
    expect(getMasterOptionQueryKey('unknown')).toBeUndefined()
  })

  it('reloads material search options', async () => {
    fetchMaterialSearchMock.mockResolvedValue([{ materialCode: 'M1' }])

    await expect(reloadMasterOptionsForModule('material')).resolves.toEqual([
      { materialCode: 'M1' },
    ])

    expect(fetchMaterialSearchMock).toHaveBeenCalledWith('', 500)
  })

  it('syncs material category resolver cache after reload', async () => {
    const options = [{ value: '盘螺', label: '盘螺' }]
    reloadMaterialCategoriesMock.mockResolvedValue(options)

    await expect(
      reloadMasterOptionsForModule('material-categories'),
    ).resolves.toEqual(options)

    expect(replaceMaterialCategoryOptionsMock).toHaveBeenCalledWith(options)
  })

  it('reloads party and warehouse options', async () => {
    reloadCustomerOptionsMock.mockResolvedValue([])
    reloadSupplierOptionsMock.mockResolvedValue([])
    reloadCarrierOptionsMock.mockResolvedValue([])
    reloadSettlementCompanyOptionsMock.mockResolvedValue([])
    reloadWarehouseOptionsMock.mockResolvedValue([])

    await reloadMasterOptionsForModule('customer')
    await reloadMasterOptionsForModule('supplier')
    await reloadMasterOptionsForModule('carrier')
    await reloadMasterOptionsForModule('settlement-company')
    await reloadMasterOptionsForModule('warehouse')

    expect(reloadCustomerOptionsMock).toHaveBeenCalled()
    expect(reloadSupplierOptionsMock).toHaveBeenCalled()
    expect(reloadCarrierOptionsMock).toHaveBeenCalled()
    expect(reloadSettlementCompanyOptionsMock).toHaveBeenCalled()
    expect(reloadWarehouseOptionsMock).toHaveBeenCalled()
  })
})
