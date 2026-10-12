import {
  fetchProjectOptions,
  type ProjectOption,
} from '@/api/master/project-options'
import type { EntityId } from '@/types/entity-id'
import type { ModuleMasterOptionRequirements } from '@/types/module-page'

/**
 * useMasterOptions 的纯函数部分。
 *
 * <p>抽出原因：该 hook 里 9 个 useQuery 都要写「总开关 && 该项被需要」，加上 9 个
 * isLoading 的 `||` 串联，控制流复杂度直接越过 react-doctor 的阈值
 * (no-high-complexity-react-function)。这里把「需求归一化」和「项目查询函数」
 * 变成无分支的纯函数，hook 只剩查询声明。</p>
 */

/** 单据类型可能只声明部分主数据需求: 统一补齐成 9 个显式布尔值。 */
export function normalizeMasterOptionRequirements(
  requirements: ModuleMasterOptionRequirements,
): Required<ModuleMasterOptionRequirements> {
  return {
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
}

/** 未选择客户时不发请求(返回空数组), 选客户后才按客户拉项目下拉。 */
export function fetchProjectOptionsFor(
  customerId?: EntityId,
): Promise<ProjectOption[]> {
  return customerId ? fetchProjectOptions(customerId) : Promise.resolve([])
}
