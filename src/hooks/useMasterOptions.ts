import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { type CarrierOption, fetchCarrierOptions } from '@/api/carrier-options'
import {
  type CustomerOption,
  fetchCustomerOptions,
} from '@/api/customer-options'
import { fetchMaterialCategories } from '@/api/material-categories'
import { fetchMaterialSearch } from '@/api/materials'
import {
  fetchSupplierOptions,
  type SupplierOption,
} from '@/api/supplier-options'
import { fetchWarehouseOptions } from '@/api/warehouse-options'
import {
  getCarrierOptions,
  getCarrierVehiclePlateOptions,
  getCustomerOptions,
  getCustomerProjectOptions,
  getSupplierOptions,
  getWarehouseOptions,
  materialCategoryOptions,
} from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useAuthStore } from '@/stores/authStore'

interface MasterOptions {
  suppliers: SupplierOption[]
  customers: CustomerOption[]
  carriers: CarrierOption[]
  warehouses: { value: string; label: string }[]
  materialCategories: { value: string; label: string }[]
  materials: Array<{
    id?: string
    materialCode?: string
    brand?: string
    category?: string
    material?: string
    spec?: string
    length?: string
    unit?: string
    quantityUnit?: string
    pieceWeightTon?: number
    piecesPerBundle?: number
    unitPrice?: number
    batchNoEnabled?: boolean
    remark?: string
    [key: string]: unknown
  }>
}

export interface MasterOptionRequirements {
  suppliers?: boolean
  customers?: boolean
  carriers?: boolean
  warehouses?: boolean
  materialCategories?: boolean
  materials?: boolean
}

type OptionDefinition = {
  options?: unknown
}

function emptyRequirements(): MasterOptionRequirements {
  return {
    suppliers: false,
    customers: false,
    carriers: false,
    warehouses: false,
    materialCategories: false,
    materials: false,
  }
}

export function resolveMasterOptionRequirements(
  definitions: OptionDefinition[] | undefined,
) {
  const requirements = emptyRequirements()

  for (const definition of definitions || []) {
    const options = definition.options
    if (typeof options !== 'function') {
      continue
    }

    if (options === getSupplierOptions) {
      requirements.suppliers = true
      continue
    }

    if (
      options === getCustomerOptions ||
      options === getCustomerProjectOptions
    ) {
      requirements.customers = true
      continue
    }

    if (
      options === getCarrierOptions ||
      options === getCarrierVehiclePlateOptions
    ) {
      requirements.carriers = true
      continue
    }

    if (options === getWarehouseOptions) {
      requirements.warehouses = true
      continue
    }

    if (options === materialCategoryOptions) {
      requirements.materialCategories = true
    }
  }

  return requirements
}

export function useMasterOptions(
  requirements: MasterOptionRequirements = {},
  enabled = true,
) {
  const token = useAuthStore((s) => s.token)
  const normalizedRequirements = useMemo(
    () => ({
      suppliers: Boolean(requirements.suppliers),
      customers: Boolean(requirements.customers),
      carriers: Boolean(requirements.carriers),
      warehouses: Boolean(requirements.warehouses),
      materialCategories: Boolean(requirements.materialCategories),
      materials: Boolean(requirements.materials),
    }),
    [
      requirements.carriers,
      requirements.customers,
      requirements.materialCategories,
      requirements.materials,
      requirements.suppliers,
      requirements.warehouses,
    ],
  )

  const queryEnabled = enabled && !!token

  const suppliers = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,
    queryFn: fetchSupplierOptions,
    enabled: queryEnabled && normalizedRequirements.suppliers,
    staleTime: 300_000,
  })

  const customers = useQuery({
    queryKey: QUERY_KEYS.masterOptions.customer,
    queryFn: fetchCustomerOptions,
    enabled: queryEnabled && normalizedRequirements.customers,
    staleTime: 300_000,
  })

  const carriers = useQuery({
    queryKey: QUERY_KEYS.masterOptions.carrier,
    queryFn: fetchCarrierOptions,
    enabled: queryEnabled && normalizedRequirements.carriers,
    staleTime: 300_000,
  })

  const warehouses = useQuery({
    queryKey: QUERY_KEYS.masterOptions.warehouse,
    queryFn: fetchWarehouseOptions,
    enabled: queryEnabled && normalizedRequirements.warehouses,
    staleTime: 300_000,
  })

  const materialCategories = useQuery({
    queryKey: QUERY_KEYS.masterOptions.materialCategories,
    queryFn: fetchMaterialCategories,
    enabled: queryEnabled && normalizedRequirements.materialCategories,
    staleTime: 300_000,
  })

  const materials = useQuery({
    queryKey: QUERY_KEYS.masterOptions.material,
    queryFn: () => fetchMaterialSearch('', 500),
    enabled: queryEnabled && normalizedRequirements.materials,
    staleTime: 300_000,
  })

  return {
    suppliers: suppliers.data || [],
    customers: customers.data || [],
    carriers: carriers.data || [],
    warehouses: warehouses.data || [],
    materialCategories: materialCategories.data || [],
    materials: materials.data || [],
    isLoading:
      suppliers.isLoading ||
      customers.isLoading ||
      carriers.isLoading ||
      warehouses.isLoading ||
      materialCategories.isLoading ||
      materials.isLoading,
  } satisfies MasterOptions & { isLoading: boolean }
}
