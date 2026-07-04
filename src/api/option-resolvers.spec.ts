import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMaterialCategoriesMock = vi.hoisted(() => vi.fn())
const fetchMaterialGradesMock = vi.hoisted(() => vi.fn())
const apiGetSupplierOptionsMock = vi.hoisted(() => vi.fn())
const apiGetCustomerOptionsMock = vi.hoisted(() => vi.fn())
const apiGetCustomerProjectOptionsMock = vi.hoisted(() => vi.fn())
const apiGetCarrierOptionsMock = vi.hoisted(() => vi.fn())
const apiGetCarrierVehiclePlateOptionsMock = vi.hoisted(() => vi.fn())
const apiGetSettlementCompanyOptionsMock = vi.hoisted(() => vi.fn())
const apiGetWarehouseOptionsMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/material-categories', () => ({
  fetchMaterialCategories: fetchMaterialCategoriesMock,
}))

vi.mock('@/api/material-grades', () => ({
  fetchMaterialGrades: fetchMaterialGradesMock,
}))

vi.mock('@/api/supplier-options', () => ({
  getSupplierOptions: apiGetSupplierOptionsMock,
}))

vi.mock('@/api/customer-options', () => ({
  getCustomerOptions: apiGetCustomerOptionsMock,
  getCustomerProjectOptions: apiGetCustomerProjectOptionsMock,
}))

vi.mock('@/api/company-settings', () => ({
  getSettlementCompanyOptions: apiGetSettlementCompanyOptionsMock,
}))

vi.mock('@/api/carrier-options', () => ({
  getCarrierOptions: apiGetCarrierOptionsMock,
  getCarrierVehiclePlateOptions: apiGetCarrierVehiclePlateOptionsMock,
}))

vi.mock('@/api/warehouse-options', () => ({
  getWarehouseOptions: apiGetWarehouseOptionsMock,
}))

import {
  customerOptions,
  getCarrierOptions,
  getCarrierVehiclePlateOptions,
  getCustomerOptions,
  getCustomerProjectOptions,
  getMaterialCategoryOptions,
  getSettlementCompanyOptions,
  getSupplierOptions,
  getWarehouseOptions,
  isPurchaseWeighRequiredCategory,
  materialCategoryOptions,
  materialGradeOptions,
  replaceMaterialCategoryOptions,
  replaceMaterialGradeOptions,
} from './option-resolvers'

describe('option-resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('material categories', () => {
    beforeEach(() => {
      replaceMaterialCategoryOptions([])
    })

    it('returns fallback options and checks isPurchaseWeighRequired before any fetch resolves', () => {
      fetchMaterialCategoriesMock.mockResolvedValue([
        { value: '新品类', label: '新品类', purchaseWeighRequired: false },
      ])
      expect(isPurchaseWeighRequiredCategory('盘螺')).toBe(true)
      expect(isPurchaseWeighRequiredCategory('螺纹钢')).toBe(false)
      expect(isPurchaseWeighRequiredCategory('')).toBe(false)
      expect(isPurchaseWeighRequiredCategory(null)).toBe(false)

      const options = materialCategoryOptions()
      expect(options).toEqual([
        {
          label: '螺纹钢',
          value: '螺纹钢',
          purchaseWeighRequired: false,
          purchaseWeighOverTolerancePercent: 5,
          purchaseWeighUnderTolerancePercent: 5,
        },
        {
          label: '盘螺',
          value: '盘螺',
          purchaseWeighRequired: true,
          purchaseWeighOverTolerancePercent: 5,
          purchaseWeighUnderTolerancePercent: 5,
        },
        {
          label: '线材',
          value: '线材',
          purchaseWeighRequired: true,
          purchaseWeighOverTolerancePercent: 5,
          purchaseWeighUnderTolerancePercent: 5,
        },
      ])
      expect(fetchMaterialCategoriesMock).toHaveBeenCalledTimes(1)
    })

    it('does not trigger fetch on subsequent calls (loading flag set)', () => {
      materialCategoryOptions()
      const options = materialCategoryOptions()
      expect(fetchMaterialCategoriesMock).toHaveBeenCalledTimes(1)
      expect(options.length).toBeGreaterThan(0)
    })

    it('getMaterialCategoryOptions returns same as materialCategoryOptions', () => {
      expect(getMaterialCategoryOptions()).toEqual(materialCategoryOptions())
    })

    it('isPurchaseWeighRequiredCategory handles undefined category', () => {
      expect(isPurchaseWeighRequiredCategory(undefined)).toBe(false)
    })

    it('uses fetched categories after async loading resolves', async () => {
      fetchMaterialCategoriesMock.mockResolvedValue([
        { value: '新品类', label: '新品类', purchaseWeighRequired: true },
      ])

      materialCategoryOptions()
      await Promise.resolve()

      expect(materialCategoryOptions()).toEqual([
        { value: '新品类', label: '新品类', purchaseWeighRequired: true },
      ])
      expect(isPurchaseWeighRequiredCategory('新品类')).toBe(true)
    })

    it('can replace category options and reset to fallback with an empty list', () => {
      replaceMaterialCategoryOptions([
        { value: '自定义', label: '自定义', purchaseWeighRequired: true },
      ])
      expect(materialCategoryOptions()).toEqual([
        { value: '自定义', label: '自定义', purchaseWeighRequired: true },
      ])

      replaceMaterialCategoryOptions([])
      expect(materialCategoryOptions().map((item) => item.value)).toEqual([
        '螺纹钢',
        '盘螺',
        '线材',
      ])
    })

    it('does not match purchase weigh category when option value is blank', () => {
      replaceMaterialCategoryOptions([
        {
          value: undefined as never,
          label: '空品类',
          purchaseWeighRequired: true,
        },
      ])

      expect(isPurchaseWeighRequiredCategory('空品类')).toBe(false)
    })

    it('ignores empty fetched category lists and keeps fallback options', async () => {
      fetchMaterialCategoriesMock.mockResolvedValue([])

      materialCategoryOptions()
      await Promise.resolve()

      expect(materialCategoryOptions().map((item) => item.value)).toEqual([
        '螺纹钢',
        '盘螺',
        '线材',
      ])
    })

    it('keeps fallback options when category loading fails', async () => {
      fetchMaterialCategoriesMock.mockRejectedValue(new Error('Network error'))

      materialCategoryOptions()
      await Promise.resolve()
      await Promise.resolve()

      expect(materialCategoryOptions().map((item) => item.value)).toEqual([
        '螺纹钢',
        '盘螺',
        '线材',
      ])
      expect(fetchMaterialCategoriesMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('material grades', () => {
    beforeEach(() => {
      replaceMaterialGradeOptions([])
    })

    it('returns fallback options and triggers fetch on first call', () => {
      fetchMaterialGradesMock.mockResolvedValue([
        { value: 'HRB600', label: 'HRB600' },
      ])

      const options = materialGradeOptions()

      expect(options).toEqual([
        { label: 'HRB400', value: 'HRB400' },
        { label: 'HRB500', value: 'HRB500' },
      ])
      expect(fetchMaterialGradesMock).toHaveBeenCalledTimes(1)
    })

    it('does not trigger fetch on subsequent calls', () => {
      fetchMaterialGradesMock.mockResolvedValue([])

      materialGradeOptions()
      materialGradeOptions()
      expect(fetchMaterialGradesMock).toHaveBeenCalledTimes(1)
    })

    it('uses fetched material grades after async loading resolves', async () => {
      fetchMaterialGradesMock.mockResolvedValue([
        { value: 'HRB600', label: 'HRB600' },
      ])

      materialGradeOptions()
      await Promise.resolve()

      expect(materialGradeOptions()).toEqual([
        { value: 'HRB600', label: 'HRB600' },
      ])
    })

    it('can replace grade options and reset to fallback with an empty list', () => {
      replaceMaterialGradeOptions([{ value: 'Q235', label: 'Q235' }])
      expect(materialGradeOptions()).toEqual([{ value: 'Q235', label: 'Q235' }])

      replaceMaterialGradeOptions([])
      expect(materialGradeOptions()).toEqual([
        { label: 'HRB400', value: 'HRB400' },
        { label: 'HRB500', value: 'HRB500' },
      ])
    })

    it('ignores empty fetched grade lists and keeps fallback options', async () => {
      fetchMaterialGradesMock.mockResolvedValue([])

      materialGradeOptions()
      await Promise.resolve()

      expect(materialGradeOptions()).toEqual([
        { label: 'HRB400', value: 'HRB400' },
        { label: 'HRB500', value: 'HRB500' },
      ])
    })

    it('getSupplierOptions returns empty when dynamic returns empty', () => {
      apiGetSupplierOptionsMock.mockReturnValue([])
      expect(getSupplierOptions()).toEqual([])
    })
  })

  describe('supplier options', () => {
    it('returns dynamic options when available', () => {
      apiGetSupplierOptionsMock.mockReturnValue([
        { value: '供应商A', label: '供应商A' },
      ])

      const result = getSupplierOptions()

      expect(result).toEqual([{ value: '供应商A', label: '供应商A' }])
    })

    it('returns fallback (empty) when no options', () => {
      apiGetSupplierOptionsMock.mockReturnValue([])

      const result = getSupplierOptions()

      expect(result).toEqual([])
    })
  })

  describe('customer options', () => {
    it('returns dynamic customer options from API', () => {
      apiGetCustomerOptionsMock.mockReturnValue([
        { value: '客户A', label: '客户A' },
      ])

      const result1 = customerOptions()
      const result2 = getCustomerOptions()

      expect(result1).toEqual([{ value: '客户A', label: '客户A' }])
      expect(result2).toEqual([{ value: '客户A', label: '客户A' }])
    })

    it('returns fallback empty customer options when API returns none', () => {
      apiGetCustomerOptionsMock.mockReturnValue([])

      expect(customerOptions()).toEqual([])
      expect(getCustomerOptions()).toEqual([])
    })
  })

  describe('getCustomerProjectOptions', () => {
    it('delegates to API', () => {
      apiGetCustomerProjectOptionsMock.mockReturnValue([
        { value: '项目X', label: '项目X' },
      ])

      const result = getCustomerProjectOptions({ customerName: '客户A' })

      expect(apiGetCustomerProjectOptionsMock).toHaveBeenCalledWith({
        customerName: '客户A',
      })
      expect(result).toEqual([{ value: '项目X', label: '项目X' }])
    })
  })

  describe('carrier options', () => {
    it('returns dynamic options when available', () => {
      apiGetCarrierOptionsMock.mockReturnValue([
        { value: '承运商A', label: '承运商A' },
      ])

      const result = getCarrierOptions()

      expect(result).toEqual([{ value: '承运商A', label: '承运商A' }])
    })

    it('returns fallback (empty) when no options', () => {
      apiGetCarrierOptionsMock.mockReturnValue([])

      const result = getCarrierOptions()

      expect(result).toEqual([])
    })
  })

  describe('getCarrierVehiclePlateOptions', () => {
    it('delegates to API', () => {
      apiGetCarrierVehiclePlateOptionsMock.mockReturnValue([
        { label: '京A12345', value: '京A12345' },
      ])

      const result = getCarrierVehiclePlateOptions({ carrierName: '承运商A' })

      expect(apiGetCarrierVehiclePlateOptionsMock).toHaveBeenCalledWith({
        carrierName: '承运商A',
      })
      expect(result).toEqual([{ label: '京A12345', value: '京A12345' }])
    })
  })

  describe('settlement company options', () => {
    it('returns dynamic options when available', () => {
      apiGetSettlementCompanyOptionsMock.mockReturnValue([
        { value: 1, label: '结算主体A', companyName: '结算主体A' },
      ])

      const result = getSettlementCompanyOptions()

      expect(result).toEqual([
        { value: 1, label: '结算主体A', companyName: '结算主体A' },
      ])
    })

    it('returns fallback (empty) when no options', () => {
      apiGetSettlementCompanyOptionsMock.mockReturnValue([])

      const result = getSettlementCompanyOptions()

      expect(result).toEqual([])
    })
  })

  describe('warehouse options', () => {
    it('returns dynamic options when available', () => {
      apiGetWarehouseOptionsMock.mockReturnValue([
        { value: '三号库', label: '三号库' },
      ])

      const result = getWarehouseOptions()

      expect(result).toEqual([{ value: '三号库', label: '三号库' }])
    })

    it('returns fallback options when no dynamic options', () => {
      apiGetWarehouseOptionsMock.mockReturnValue([])

      const result = getWarehouseOptions()

      expect(result).toEqual([
        { label: '一号库', value: '一号库' },
        { label: '二号库', value: '二号库' },
      ])
    })
  })
})
