import { useQuery } from '@tanstack/react-query'
import { fetchSupplierOptions, type SupplierOption } from '@/api/supplier-options'
import { fetchCustomerOptions, type CustomerOption } from '@/api/customer-options'
import { fetchCarrierOptions, type CarrierOption } from '@/api/carrier-options'
import { fetchWarehouseOptions } from '@/api/warehouse-options'
import { fetchMaterialCategories } from '@/api/material-categories'
import { useAuthStore } from '@/stores/authStore'

interface MasterOptions {
  suppliers: SupplierOption[]
  customers: CustomerOption[]
  carriers: CarrierOption[]
  warehouses: { value: string; label: string }[]
  materialCategories: { value: string; label: string }[]
}

export function useMasterOptions() {
  const token = useAuthStore((s) => s.token)

  const suppliers = useQuery({
    queryKey: ['master-options', 'suppliers'],
    queryFn: fetchSupplierOptions,
    enabled: !!token,
    staleTime: 300_000,
  })

  const customers = useQuery({
    queryKey: ['master-options', 'customers'],
    queryFn: fetchCustomerOptions,
    enabled: !!token,
    staleTime: 300_000,
  })

  const carriers = useQuery({
    queryKey: ['master-options', 'carriers'],
    queryFn: fetchCarrierOptions,
    enabled: !!token,
    staleTime: 300_000,
  })

  const warehouses = useQuery({
    queryKey: ['master-options', 'warehouses'],
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

  return {
    suppliers: suppliers.data || [],
    customers: customers.data || [],
    carriers: carriers.data || [],
    warehouses: warehouses.data || [],
    materialCategories: materialCategories.data || [],
    isLoading:
      suppliers.isLoading || customers.isLoading || carriers.isLoading ||
      warehouses.isLoading || materialCategories.isLoading,
  } satisfies MasterOptions & { isLoading: boolean }
}
