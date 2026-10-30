import i18next from 'i18next'
import type { LengthPremiumOption } from '@/api/master/length-premiums'
import type { MaterialCategoryOption } from '@/api/master/material-categories'
import type { MaterialGradeOption } from '@/api/master/material-grades'
import type { ProjectOption } from '@/api/master/project-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { resolveQuoteRegions } from '@/constants/quote-regions'
import { MATERIAL_BRANDS_QUERY_KEY } from '@/hooks/useMaterialBrands'
import { queryClient } from '@/lib/query-client'
import { tagMasterOptionRequirements } from '@/module-system/core/master-option-requirement-tag'
import {
  getCarrierOptions as rawCarrierOptions,
  getCarrierVehiclePlateOptions as rawCarrierVehiclePlateOptions,
} from '@/queries/master/carrier-options'
import { getCustomerOptions as rawCustomerOptions } from '@/queries/master/customer-options'
import { getSupplierOptions as rawSupplierOptions } from '@/queries/master/supplier-options'
import { getWarehouseOptions as rawWarehouseOptions } from '@/queries/master/warehouse-options'
import { getCachedQueryData } from '@/queries/query-cached-options'
import { getSettlementCompanyOptions as rawSettlementCompanyOptions } from '@/queries/system/company-settings'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleFormFieldOption,
  ModuleRecordInput,
} from '@/types/module-page'
import type { RuntimeConfigResponse } from '@/types/runtime-config'
import { asString } from '@/utils/type-narrowing'

// 每个解析器都带上「需要哪些主数据」的打包安全标记，避免只靠函数引用相等判定（见标记模块注释）。
export const getCarrierOptions = tagMasterOptionRequirements(
  rawCarrierOptions,
  ['carriers'],
)
export const getCarrierVehiclePlateOptions = tagMasterOptionRequirements(
  rawCarrierVehiclePlateOptions,
  ['carriers'],
)
export const getCustomerOptions = tagMasterOptionRequirements(
  rawCustomerOptions,
  ['customers'],
)
export const getSupplierOptions = tagMasterOptionRequirements(
  rawSupplierOptions,
  ['suppliers'],
)
export const getWarehouseOptions = tagMasterOptionRequirements(
  rawWarehouseOptions,
  ['warehouses'],
)
export const getSettlementCompanyOptions = tagMasterOptionRequirements(
  rawSettlementCompanyOptions,
  ['settlementCompanies'],
)

/*
 * 冷启动兜底词表（**权威来源是主数据** `md_material_category`，这里只在缓存未命中时
 * 顶上，避免下拉为空）。
 *
 * 2026-10 修正：旧词表是「螺纹钢 / 盘螺 / 线材」，而库里实际是「直条 / 盘螺 / 线材」
 * （`purchase_weigh_required`：直条 false、盘螺 true、线材 true）——「螺纹钢」已不存在、
 * 最常用的「直条」反而缺失，导致冷启动窗口内「是否需过磅」判定取错。改词表时必须与
 * 主数据同步；若主数据再变，应优先补 `materialCategories` 需求让真实数据到位，
 * 而不是继续扩这张表。
 */
const materialCategoryFallbackOptions: MaterialCategoryOption[] = [
  '直条',
  '盘螺',
  '线材',
].map((value) => ({
  label: value,
  value,
  purchaseWeighRequired: value === '盘螺' || value === '线材',
}))

/*
 * 材质（牌号）**不做兜底**：它是商品资料里的数据（`SELECT DISTINCT material`，
 * 当前为 HPB300 / HRB400 / HRB400E / HRB500E 加若干费用类），随录入口径变化，
 * 写死任何一份都会随数据漂移变成错值（旧值是 HRB400 / HRB500，其中 HRB500 库里并不存在）。
 * 缓存未命中时宁可下拉为空，也不要给出选了也查不到商品的假选项。
 */
const materialGradeFallbackOptions: MaterialGradeOption[] = []

function cachedOptions<T>(queryKey: readonly unknown[]): T[] {
  return getCachedQueryData<T>(queryKey)
}

function optionalId(value: unknown, field: string): EntityId | undefined {
  try {
    return parseOptionalEntityId(value, field)
  } catch {
    return undefined
  }
}

function rawMaterialCategoryOptions(): MaterialCategoryOption[] {
  const options = cachedOptions<MaterialCategoryOption>(
    QUERY_KEYS.masterOptions.materialCategories,
  )
  return options.length ? options : materialCategoryFallbackOptions
}

export const materialCategoryOptions = tagMasterOptionRequirements(
  rawMaterialCategoryOptions,
  ['materialCategories'],
)

export const getMaterialCategoryOptions = materialCategoryOptions

export function isPurchaseWeighRequiredCategory(category: unknown): boolean {
  const normalized = asString(category).trim()
  if (!normalized) {
    return false
  }
  return materialCategoryOptions().some(
    (option) =>
      String(option.value || '').trim() === normalized &&
      Boolean(option.purchaseWeighRequired),
  )
}

function rawMaterialGradeOptions(): MaterialGradeOption[] {
  const options = cachedOptions<MaterialGradeOption>(
    QUERY_KEYS.masterOptions.materialGrades,
  )
  return options.length ? options : materialGradeFallbackOptions
}

export const materialGradeOptions = tagMasterOptionRequirements(
  rawMaterialGradeOptions,
  ['materialGrades'],
)

/**
 * 供应商「经营品牌」多选：数据是**商品资料去重后的品牌清单**，不是独立主数据表。
 *
 * <p>预取由 `useMasterOptions` 的 `brands` 需求负责，且与比价页 `useMaterialBrands`
 * 共用同一个缓存键 `MATERIAL_BRANDS_QUERY_KEY`（同 key 同 queryFn ⇒ 只请求一次）；
 * 本解析器只做同步读缓存，形态与 `getSupplierOptions` 等一致。缓存未命中时返回空数组，
 * 不写死词表 —— 品牌随商品资料变化，硬编码会漂移成错值。</p>
 */
function rawBrandOptions(): ModuleFormFieldOption[] {
  return cachedOptions<string>(MATERIAL_BRANDS_QUERY_KEY).map((brand) => ({
    label: brand,
    value: brand,
  }))
}

export const getBrandOptions = tagMasterOptionRequirements(rawBrandOptions, [
  'brands',
])

/**
 * 材料「长度」下拉：**定尺主数据**（只取「正常」状态）+「无定尺（卷材）」。
 *
 * <p>长度不是自由文本：材料资料的 `length` 参与定尺加价、商品匹配与打印规格后缀，
 * 因此选项必须来自 `md_length_premium`。这里**不写死 9米/12米 兜底** —— 定尺是业务可维护的
 * 主数据，写死一份会让新增定尺永远选不到（与 materialGrades 的处理口径一致：缓存未命中
 * 就返回空，宁可为空也不给假选项）。预取由 `useMasterOptions` 的 `lengthPremiums` 需求负责。</p>
 *
 * <p>末尾固定追加「无定尺（卷材）」= `'-'`：盘螺等卷材在业务上确实没有定尺，而 `'-'` 是
 * 全站统一的「无定尺」占位值（比价页 `isLengthColumn` 同样把 `'-'`/`''` 视为"不是一种定尺"）。
 * 它是**语义占位**而不是可被主数据淘汰的具体定尺，所以保留为固定项。</p>
 *
 * <p>**唯一出口**：材料表单长度下拉、以及任何按定尺取值的下拉都只该走这里。</p>
 */
function rawLengthOptions(): ModuleFormFieldOption[] {
  const options = cachedOptions<LengthPremiumOption>(
    QUERY_KEYS.masterOptions.lengthPremiums,
  ).map((option) => ({ label: option.label, value: option.value }))
  return [
    ...options,
    {
      label: i18next.t('modules.pages.material.noFixedLength'),
      value: '-',
    },
  ]
}

export const getLengthOptions = tagMasterOptionRequirements(rawLengthOptions, [
  'lengthPremiums',
])

function rawCustomerProjectOptions(
  form?: ModuleRecordInput,
  loadedOptions?: readonly ProjectOption[],
): ProjectOption[] {
  const customerIdentity =
    form?.customerId ??
    (asString(form?.counterpartyType).trim() === '客户'
      ? form?.counterpartyId
      : undefined)
  const customerId = optionalId(customerIdentity, 'customerId')
  if (!customerId) {
    return []
  }

  const options =
    loadedOptions ??
    cachedOptions<ProjectOption>(QUERY_KEYS.masterOptions.project(customerId))
  return options.filter((option) => option.customerId === customerId)
}

export const getCustomerProjectOptions = tagMasterOptionRequirements(
  rawCustomerProjectOptions,
  ['customers', 'projects'],
)

export function findProjectOption(
  projectId: unknown,
  customerId: unknown,
): ProjectOption | undefined {
  const normalizedProjectId = optionalId(projectId, 'projectId')
  const normalizedCustomerId = optionalId(customerId, 'customerId')
  if (!normalizedProjectId || !normalizedCustomerId) {
    return undefined
  }
  return getCustomerProjectOptions({ customerId: normalizedCustomerId }).find(
    (row) =>
      row.id === normalizedProjectId && row.customerId === normalizedCustomerId,
  )
}

/** 财务单据资金账户字段的标识解析器；具体选项由编辑器按结算主体注入。 */
export function getSettlementAccountOptions() {
  return []
}

/**
 * 项目资料「取价地区」下拉：数据是后端 runtime-config 下发的地区清单
 * （`business.quoteRegions`，后端来源 `leo.market.steelx-quote.regions`），
 * **不是主数据接口**。
 *
 * <p>**刻意不打 `tagMasterOptionRequirements` 标记**：该标记的语义是「`useMasterOptions`
 * 需要预取的主数据项」，消费方看到标记就会去加载对应的 master-options 查询；而取价地区
 * 根本不在主数据体系里（`ModuleMasterOptionRequirements` 没有 `quoteRegions` 这一项），
 * 错标只会让编辑器去请求一个不存在的主数据项。数据加载由 runtime-config 自己保证：
 * `main.tsx` 在首次 `root.render(<App />)` 之前 `await queryClient.ensureQueryData(runtime-config)`
 * （`src/main.tsx:110-125`），路由 `beforeLoad` 与列表预取也 ensure 同一个 key，
 * 因此进入页面时缓存已就绪。</p>
 *
 * <p>**兜底**：bootstrap 用 `Promise.allSettled` 包住 runtime-config 请求（失败不阻断渲染），
 * 旧版后端也可能下发空清单，所以缓存可能缺失或为空。此时交给 `resolveQuoteRegions`
 * 回退到 `DEFAULT_QUOTE_REGIONS`（`src/constants/quote-regions.ts` 的 5 个城市），
 * 不在这里写死城市列表，也不返回空下拉；该函数同时负责 trim / 去空 / 去重。</p>
 *
 * <p>**唯一出口**：项目资料的取价地区下拉（以及任何需要取价地区选项的字段）都只该走这里。</p>
 */
export function getQuoteRegionOptions(): ModuleFormFieldOption[] {
  const runtimeConfig = queryClient.getQueryData<RuntimeConfigResponse>(
    QUERY_KEYS.runtimeConfig,
  )
  return resolveQuoteRegions(runtimeConfig?.business.quoteRegions).map(
    (region) => ({ label: region, value: region }),
  )
}
