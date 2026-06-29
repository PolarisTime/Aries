import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useQueryMock,
  fetchSupplierOptionsMock,
  fetchSettlementCompanyOptionsMock,
  fetchCustomerOptionsMock,
  fetchCarrierOptionsMock,
  fetchWarehouseOptionsMock,
  fetchMaterialCategoriesMock,
  fetchMaterialSearchMock,
  useAuthStoreMock,
  getSupplierOptionsFn,
  getCustomerOptionsFn,
  getCustomerProjectOptionsFn,
  getCarrierOptionsFn,
  getCarrierVehiclePlateOptionsFn,
  getSettlementCompanyOptionsFn,
  getWarehouseOptionsFn,
  materialCategoryOptionsFn,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  fetchSupplierOptionsMock: vi.fn(),
  fetchSettlementCompanyOptionsMock: vi.fn(),
  fetchCustomerOptionsMock: vi.fn(),
  fetchCarrierOptionsMock: vi.fn(),
  fetchWarehouseOptionsMock: vi.fn(),
  fetchMaterialCategoriesMock: vi.fn(),
  fetchMaterialSearchMock: vi.fn(),
  useAuthStoreMock: vi.fn(),
  getSupplierOptionsFn: vi.fn(),
  getCustomerOptionsFn: vi.fn(),
  getCustomerProjectOptionsFn: vi.fn(),
  getCarrierOptionsFn: vi.fn(),
  getCarrierVehiclePlateOptionsFn: vi.fn(),
  getSettlementCompanyOptionsFn: vi.fn(),
  getWarehouseOptionsFn: vi.fn(),
  materialCategoryOptionsFn: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

vi.mock('@/api/carrier-options', () => ({
  fetchCarrierOptions: fetchCarrierOptionsMock,
}))

vi.mock('@/api/customer-options', () => ({
  fetchCustomerOptions: fetchCustomerOptionsMock,
}))

vi.mock('@/api/company-settings', () => ({
  fetchSettlementCompanyOptions: fetchSettlementCompanyOptionsMock,
}))

vi.mock('@/api/material-categories', () => ({
  fetchMaterialCategories: fetchMaterialCategoriesMock,
}))

vi.mock('@/api/materials', () => ({
  fetchMaterialSearch: fetchMaterialSearchMock,
}))

vi.mock('@/api/supplier-options', () => ({
  fetchSupplierOptions: fetchSupplierOptionsMock,
}))

vi.mock('@/api/warehouse-options', () => ({
  fetchWarehouseOptions: fetchWarehouseOptionsMock,
}))

vi.mock('@/constants/module-options', () => ({
  getSupplierOptions: getSupplierOptionsFn,
  getCustomerOptions: getCustomerOptionsFn,
  getCustomerProjectOptions: getCustomerProjectOptionsFn,
  getCarrierOptions: getCarrierOptionsFn,
  getCarrierVehiclePlateOptions: getCarrierVehiclePlateOptionsFn,
  getSettlementCompanyOptions: getSettlementCompanyOptionsFn,
  getWarehouseOptions: getWarehouseOptionsFn,
  materialCategoryOptions: materialCategoryOptionsFn,
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    masterOptions: {
      supplier: ['supplier'],
      customer: ['customer'],
      carrier: ['carrier'],
      settlementCompany: ['settlementCompany'],
      warehouse: ['warehouse'],
      materialCategories: ['materialCategories'],
      material: ['material'],
    },
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}))

import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from './useMasterOptions'

describe('useMasterOptions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useAuthStoreMock.mockReturnValue('test-token')
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false })
  })

  it('returns empty arrays by default', () => {
    const { result } = renderHook(() => useMasterOptions())
    expect(result.current.suppliers).toEqual([])
    expect(result.current.customers).toEqual([])
    expect(result.current.carriers).toEqual([])
    expect(result.current.warehouses).toEqual([])
    expect(result.current.materialCategories).toEqual([])
    expect(result.current.materials).toEqual([])
  })

  it('returns data from queries', () => {
    const suppliers = [{ id: '1', name: 'Supplier A' }]
    const customers = [{ id: '1', name: 'Customer A' }]
    const carriers = [{ id: '1', name: 'Carrier A' }]
    const settlementCompanies = [{ id: 1, companyName: '结算主体A' }]
    const warehouses = [{ value: '1', label: 'Warehouse A' }]
    const materialCategories = [{ value: '1', label: 'Category A' }]
    const materials = [{ id: '1', materialCode: 'M001' }]

    useQueryMock
      .mockReturnValueOnce({ data: suppliers, isLoading: false })
      .mockReturnValueOnce({ data: customers, isLoading: false })
      .mockReturnValueOnce({ data: carriers, isLoading: false })
      .mockReturnValueOnce({ data: settlementCompanies, isLoading: false })
      .mockReturnValueOnce({ data: warehouses, isLoading: false })
      .mockReturnValueOnce({ data: materialCategories, isLoading: false })
      .mockReturnValueOnce({ data: materials, isLoading: false })

    const { result } = renderHook(() =>
      useMasterOptions({
        suppliers: true,
        customers: true,
        carriers: true,
        settlementCompanies: true,
        warehouses: true,
        materialCategories: true,
        materials: true,
      }),
    )

    expect(result.current.suppliers).toEqual(suppliers)
    expect(result.current.customers).toEqual(customers)
    expect(result.current.carriers).toEqual(carriers)
    expect(result.current.settlementCompanies).toEqual(settlementCompanies)
    expect(result.current.warehouses).toEqual(warehouses)
    expect(result.current.materialCategories).toEqual(materialCategories)
    expect(result.current.materials).toEqual(materials)
  })

  it('enables queries based on requirements', () => {
    renderHook(() => useMasterOptions({ suppliers: true, customers: false }))

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['supplier'],
        enabled: true,
      }),
    )
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['customer'],
        enabled: false,
      }),
    )
  })

  it('disables all queries when enabled is false', () => {
    renderHook(() => useMasterOptions({ suppliers: true }, false))

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('disables all queries when token is missing', () => {
    useAuthStoreMock.mockReturnValue(null)
    renderHook(() => useMasterOptions({ suppliers: true }))

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('returns isLoading true when any query is loading', () => {
    useQueryMock
      .mockReturnValueOnce({ data: undefined, isLoading: true })
      .mockReturnValueOnce({ data: undefined, isLoading: false })

    const { result } = renderHook(() =>
      useMasterOptions({ suppliers: true, customers: true }),
    )

    expect(result.current.isLoading).toBe(true)
  })
})

describe('resolveMasterOptionRequirements', () => {
  it('returns empty requirements for undefined definitions', () => {
    const result = resolveMasterOptionRequirements(undefined)
    expect(result).toEqual({
      suppliers: false,
      customers: false,
      carriers: false,
      warehouses: false,
      settlementCompanies: false,
      materialCategories: false,
      materials: false,
    })
  })

  it('detects supplier options', () => {
    const result = resolveMasterOptionRequirements([
      { options: getSupplierOptionsFn },
    ])
    expect(result.suppliers).toBe(true)
  })

  it('detects customer options', () => {
    const result = resolveMasterOptionRequirements([
      { options: getCustomerOptionsFn },
    ])
    expect(result.customers).toBe(true)
  })

  it('detects customer project options', () => {
    const result = resolveMasterOptionRequirements([
      { options: getCustomerProjectOptionsFn },
    ])
    expect(result.customers).toBe(true)
  })

  it('detects carrier options', () => {
    const result = resolveMasterOptionRequirements([
      { options: getCarrierOptionsFn },
    ])
    expect(result.carriers).toBe(true)
  })

  it('detects carrier vehicle plate options', () => {
    const result = resolveMasterOptionRequirements([
      { options: getCarrierVehiclePlateOptionsFn },
    ])
    expect(result.carriers).toBe(true)
  })

  it('detects warehouse options', () => {
    const result = resolveMasterOptionRequirements([
      { options: getWarehouseOptionsFn },
    ])
    expect(result.warehouses).toBe(true)
  })

  it('detects settlement company options', () => {
    const result = resolveMasterOptionRequirements([
      { options: getSettlementCompanyOptionsFn },
    ])
    expect(result.settlementCompanies).toBe(true)
  })

  it('detects material category options', () => {
    const result = resolveMasterOptionRequirements([
      { options: materialCategoryOptionsFn },
    ])
    expect(result.materialCategories).toBe(true)
  })

  it('handles non-function options', () => {
    const result = resolveMasterOptionRequirements([{ options: 'some-string' }])
    expect(result.suppliers).toBe(false)
  })
})
