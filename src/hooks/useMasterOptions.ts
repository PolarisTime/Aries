import { useQuery } from '@tanstack/react-query'

import {
  type CarrierOption,
  fetchCarrierOptions,
  getCarrierEntityOptions,
} from '@/api/master/carrier-options'
import {
  type CustomerOption,
  fetchCustomerOptions,
} from '@/api/master/customer-options'
import { fetchMaterialCategories } from '@/api/master/material-categories'
import {
  fetchMaterialGrades,
  type MaterialGradeOption,
} from '@/api/master/material-grades'
import {
  fetchMaterialSearch,
  type MaterialSearchResponse,
} from '@/api/master/materials'
import {
  fetchProjectOptions,
  type ProjectOption,
} from '@/api/master/project-options'
import {
  fetchSupplierOptions,
  type SupplierOption,
} from '@/api/master/supplier-options'
import {
  fetchWarehouseOptions,
  type WarehouseOption,
} from '@/api/master/warehouse-options'
import {
  fetchSettlementCompanyOptions,
  type SettlementCompanyOption,
} from '@/api/system/company-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  getCarrierOptions,
  getCarrierVehiclePlateOptions,
  getCustomerOptions,
  getCustomerProjectOptions,
  getSettlementCompanyOptions,
  getSupplierOptions,
  getWarehouseOptions,
  materialCategoryOptions,
  materialGradeOptions,
} from '@/module-system/core/module-option-resolvers'
import { useAuthStore } from '@/stores/authStore'
import type { EntityId } from '@/types/entity-id'
import type { ModuleMasterOptionRequirements } from '@/types/module-page'

interface MasterOptions {
  suppliers: SupplierOption[]
  customers: CustomerOption[]
  projects: ProjectOption[]
  carriers: CarrierOption[]
  settlementCompanies: SettlementCompanyOption[]
  warehouses: WarehouseOption[]
  materialCategories: { value: string; label: string }[]
  materialGrades: MaterialGradeOption[]
  materials: MaterialSearchResponse[]
}

export type MasterOptionRequirements = ModuleMasterOptionRequirements

type OptionDefinition = {
  options?: unknown
  masterOptionRequirements?: MasterOptionRequirements
}

function emptyRequirements(): MasterOptionRequirements {
  return {
    suppliers: false,
    customers: false,
    projects: false,
    carriers: false,
    settlementCompanies: false,
    warehouses: false,
    materialCategories: false,
    materialGrades: false,
    materials: false,
  }
}

export function resolveMasterOptionRequirements(
  definitions: OptionDefinition[] | undefined,
) {
  const requirements = emptyRequirements()

  for (const definition of definitions || []) {
    for (const key of Object.keys(requirements) as Array<
      keyof MasterOptionRequirements
    >) {
      requirements[key] ||= Boolean(definition.masterOptionRequirements?.[key])
    }

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
      if (options === getCustomerProjectOptions) {
        requirements.projects = true
      }
      continue
    }

    if (
      options === getCarrierOptions ||
      options === getCarrierEntityOptions ||
      options === getCarrierVehiclePlateOptions
    ) {
      requirements.carriers = true
      continue
    }

    if (options === getWarehouseOptions) {
      requirements.warehouses = true
      continue
    }

    if (options === getSettlementCompanyOptions) {
      requirements.settlementCompanies = true
      continue
    }

    if (options === materialCategoryOptions) {
      requirements.materialCategories = true
      continue
    }

    if (options === materialGradeOptions) {
      requirements.materialGrades = true
    }
  }

  return requirements
}

export function useMasterOptions(
  requirements: MasterOptionRequirements = {},
  enabled = true,
  customerId?: EntityId,
) {
  const token = useAuthStore((s) => s.token)
  const normalizedRequirements = {
    suppliers: Boolean(requirements.suppliers),
    customers: Boolean(requirements.customers),
    projects: Boolean(requirements.projects),
    carriers: Boolean(requirements.carriers),
    settlementCompanies: Boolean(requirements.settlementCompanies),
    warehouses: Boolean(requirements.warehouses),
    materialCategories: Boolean(requirements.materialCategories),
    materialGrades: Boolean(requirements.materialGrades),
    materials: Boolean(requirements.materials),
  }

  const queryEnabled = enabled && !!token

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,
    queryFn: fetchSupplierOptions,
    enabled: queryEnabled && normalizedRequirements.suppliers,
    staleTime: 300_000,
  })

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.customer,
    queryFn: fetchCustomerOptions,
    enabled: queryEnabled && normalizedRequirements.customers,
    staleTime: 300_000,
  })

  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.carrier,
    queryFn: fetchCarrierOptions,
    enabled: queryEnabled && normalizedRequirements.carriers,
    staleTime: 300_000,
  })

  const {
    data: settlementCompanies = [],
    isLoading: settlementCompaniesLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.settlementCompany,
    queryFn: fetchSettlementCompanyOptions,
    enabled: queryEnabled && normalizedRequirements.settlementCompanies,
    staleTime: 300_000,
  })

  const { data: materialGrades = [], isLoading: materialGradesLoading } =
    useQuery({
      queryKey: QUERY_KEYS.masterOptions.materialGrades,
      queryFn: fetchMaterialGrades,
      enabled: queryEnabled && normalizedRequirements.materialGrades,
      staleTime: 300_000,
    })

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.warehouse,
    queryFn: fetchWarehouseOptions,
    enabled: queryEnabled && normalizedRequirements.warehouses,
    staleTime: 300_000,
  })

  const {
    data: materialCategories = [],
    isLoading: materialCategoriesLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.materialCategories,
    queryFn: fetchMaterialCategories,
    enabled: queryEnabled && normalizedRequirements.materialCategories,
    staleTime: 300_000,
  })

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.material,
    queryFn: () => fetchMaterialSearch('', 500),
    enabled: queryEnabled && normalizedRequirements.materials,
    staleTime: 300_000,
  })

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.project(customerId || 'none'),
    queryFn: () =>
      customerId ? fetchProjectOptions(customerId) : Promise.resolve([]),
    enabled:
      queryEnabled && normalizedRequirements.projects && Boolean(customerId),
    staleTime: 300_000,
  })

  return {
    suppliers,
    customers,
    projects,
    carriers,
    settlementCompanies,
    warehouses,
    materialCategories,
    materialGrades,
    materials,
    isLoading:
      suppliersLoading ||
      customersLoading ||
      projectsLoading ||
      carriersLoading ||
      settlementCompaniesLoading ||
      warehousesLoading ||
      materialCategoriesLoading ||
      materialGradesLoading ||
      materialsLoading,
  } satisfies MasterOptions & { isLoading: boolean }
}
