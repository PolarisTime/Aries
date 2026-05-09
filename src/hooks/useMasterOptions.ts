import { useQuery } from '@tanstack/react-query'
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
import { useAuthStore } from '@/stores/authStore'

interface MasterOptions {
  suppliers: SupplierOption[]
  customers: CustomerOption[]
  carriers: CarrierOption[]
  warehouses: { value: string; label: string }[]
  materialCategories: { value: string; label: string }[]
  materials: Array<Record<string, unknown>>
}

export function useMasterOptions() {
  const token = useAuthStore((s) => s.token)

  const suppliers = useQuery({
    queryKey: ['master-options', 'supplier'],
    queryFn: fetchSupplierOptions,
    enabled: !!token,
    staleTime: 300_000,
  })

  const customers = useQuery({
    queryKey: ['master-options', 'customer'],
    queryFn: fetchCustomerOptions,
    enabled: !!token,
    staleTime: 300_000,
  })

  const carriers = useQuery({
    queryKey: ['master-options', 'carrier'],
    queryFn: fetchCarrierOptions,
    enabled: !!token,
    staleTime: 300_000,
  })

  const warehouses = useQuery({
    queryKey: ['master-options', 'warehouse'],
    queryFn: fetchWarehouseOptions,
    enabled: !!token,
    staleTime: 300_000,
  })

  const materialCategories = useQuery({
    queryKey: ['master-options', 'material-categories'],
    queryFn: fetchMaterialCategories,
    enabled: !!token,
    staleTime: 300_000,
  })

  const materials = useQuery({
    queryKey: ['master-options', 'material'],
    queryFn: () => fetchMaterialSearch('', 500),
    enabled: !!token,
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
