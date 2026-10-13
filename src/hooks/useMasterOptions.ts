import { useQuery } from '@tanstack/react-query'

import {
  type CarrierOption,
  fetchCarrierOptions,
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
  fetchAllMaterialOptions,
  type MaterialSearchResponse,
} from '@/api/master/materials'
import type { ProjectOption } from '@/api/master/project-options'
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
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import {
  fetchProjectOptionsFor,
  normalizeMasterOptionRequirements,
} from '@/hooks/master-options-utils'
import { readMasterOptionRequirements } from '@/module-system/core/master-option-requirement-tag'
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
import { getCarrierEntityOptions } from '@/queries/master/carrier-options'
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

    // 标记优先: 打包分块会复制函数对象, 只靠引用相等会静默失效(下拉为空且无任何报错)。
    const tagged = readMasterOptionRequirements(options)
    if (tagged) {
      for (const key of tagged) {
        requirements[key] = true
      }
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
  const normalizedRequirements = normalizeMasterOptionRequirements(requirements)

  const queryEnabled = enabled && Boolean(token)
  // 「总开关 && 该主数据被需要」收敛成一次调用: 否则 9 个 useQuery 会摊开
  // 9 份重复的 && 分支, 把本 hook 的控制流复杂度顶过阈值。
  const supports = (required: boolean) => queryEnabled && required

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,
    queryFn: fetchSupplierOptions,
    enabled: supports(normalizedRequirements.suppliers),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.customer,
    queryFn: fetchCustomerOptions,
    enabled: supports(normalizedRequirements.customers),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.carrier,
    queryFn: fetchCarrierOptions,
    enabled: supports(normalizedRequirements.carriers),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const {
    data: settlementCompanies = [],
    isLoading: settlementCompaniesLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.settlementCompany,
    queryFn: ({ signal }) => fetchSettlementCompanyOptions(signal),
    enabled: supports(normalizedRequirements.settlementCompanies),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const { data: materialGrades = [], isLoading: materialGradesLoading } =
    useQuery({
      queryKey: QUERY_KEYS.masterOptions.materialGrades,
      queryFn: fetchMaterialGrades,
      enabled: supports(normalizedRequirements.materialGrades),
      staleTime: STALE_MASTER_OPTIONS,
    })

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.warehouse,
    queryFn: fetchWarehouseOptions,
    enabled: supports(normalizedRequirements.warehouses),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const {
    data: materialCategories = [],
    isLoading: materialCategoriesLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.materialCategories,
    queryFn: fetchMaterialCategories,
    enabled: supports(normalizedRequirements.materialCategories),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.material,
    queryFn: () => fetchAllMaterialOptions(),
    enabled: supports(normalizedRequirements.materials),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.project(customerId || 'none'),
    queryFn: () => fetchProjectOptionsFor(customerId),
    enabled: supports(normalizedRequirements.projects && Boolean(customerId)),
    staleTime: STALE_MASTER_OPTIONS,
  })

  // 9 个 loading 用 some(Boolean) 合并: 串成 || 会再摊开 9 个分支。
  const isLoading = [
    suppliersLoading,
    customersLoading,
    projectsLoading,
    carriersLoading,
    settlementCompaniesLoading,
    warehousesLoading,
    materialCategoriesLoading,
    materialGradesLoading,
    materialsLoading,
  ].some(Boolean)

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
    isLoading,
  } satisfies MasterOptions & { isLoading: boolean }
}
