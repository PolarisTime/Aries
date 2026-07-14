import { beforeEach, describe, expect, it, vi } from 'vitest'

const { httpGetMock } = vi.hoisted(() => ({
  httpGetMock: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: httpGetMock,
  },
}))

import { fetchCarrierOptions, reloadCarrierOptions } from './carrier-options'
import { reloadSettlementCompanyOptions } from './company-settings'
import { fetchCustomerOptions, reloadCustomerOptions } from './customer-options'
import {
  fetchMaterialCategories,
  reloadMaterialCategories,
} from './material-categories'
import { fetchSupplierOptions, reloadSupplierOptions } from './supplier-options'
import {
  fetchWarehouseOptions,
  reloadWarehouseOptions,
} from './warehouse-options'

describe('master option API endpoints', () => {
  beforeEach(() => {
    httpGetMock.mockReset()
    httpGetMock.mockResolvedValue({ data: [] })
  })

  it.each([
    ['supplier', fetchSupplierOptions, '/suppliers/options'],
    ['customer', fetchCustomerOptions, '/customers/options'],
    ['carrier', fetchCarrierOptions, '/carriers/options'],
    ['warehouse', fetchWarehouseOptions, '/warehouses/options'],
    [
      'material category',
      fetchMaterialCategories,
      '/material-categories/options',
    ],
  ])('fetches %s options through the backend contract path', async (_, fetchOptions, endpoint) => {
    await fetchOptions()

    expect(httpGetMock).toHaveBeenCalledWith(endpoint)
  })

  it.each([
    ['supplier', reloadSupplierOptions, '/suppliers/options'],
    ['customer', reloadCustomerOptions, '/customers/options'],
    ['carrier', reloadCarrierOptions, '/carriers/options'],
    ['warehouse', reloadWarehouseOptions, '/warehouses/options'],
    [
      'material category',
      reloadMaterialCategories,
      '/material-categories/options',
    ],
    [
      'settlement company',
      reloadSettlementCompanyOptions,
      '/company-settings/options',
    ],
  ])('reloads %s options through the startup contract path', async (_, reloadOptions, endpoint) => {
    await reloadOptions()

    expect(httpGetMock).toHaveBeenCalledWith(endpoint)
  })
})
