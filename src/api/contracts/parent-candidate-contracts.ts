import type { ModuleEndpointConfig } from '@/api/contracts/module-contract-types'
import type { ModuleParentImportDefinition } from '@/types/module-page'

export type ParentCandidateSource =
  | NonNullable<ModuleParentImportDefinition['candidateQueryType']>
  | NonNullable<ModuleParentImportDefinition['candidateStatementModuleKey']>

/**
 * 候选查询的**请求参数**契约。
 *
 * <p><b>它只回答一个问题</b>：用户填的筛选值里，哪些 key 能真正变成候选接口的 query 参数
 * （`buildFilterParamsFromContract` 用它剔除接口不认识的 key）。</p>
 *
 * <p><b>它不再决定弹层显示哪些筛选</b>。弹层筛选已改为「默认全放行 + 显式排除」：
 * 上游列表页配了哪些筛选，弹层就继承哪些，只有被
 * {@link ParentCandidateFilterContract.selectorFilterOmissions} 显式排除的才不显示。
 * 历史上这里是「允许清单」（页面筛选必须同时出现在 `nativeFilterKeys` 里才会出现在弹层），
 * 于是每加一个筛选要改两处，弹层筛选区长期比列表页少一半 —— 那套写法已废弃。</p>
 */
export interface ParentCandidateFilterContract
  extends Pick<ModuleEndpointConfig, 'nativeFilterKeys' | 'dateRangeMapping'> {
  /**
   * 弹层筛选的**语义排除**清单（与接口能力无关，只说"这个筛选不该出现在候选列表里"）。
   *
   * <p>缺省使用 {@link DEFAULT_SELECTOR_FILTER_OMISSIONS}；某个候选来源若要额外再排除，
   * 就在这里追加。</p>
   */
  selectorFilterOmissions?: readonly string[]
}

/**
 * 六个候选来源共用的语义排除项。
 *
 * <p>为什么排除「被引用状态」（`referencedBy`）: 它描述的是"这张单已被谁引用过"，
 * 属于**下游视角**。放在候选列表里有两处害处 ——
 * ① 用户会以为已引用的单据不能选（实际可以重复引用）；
 * ② 一旦按它过滤，候选条数变少却看不出原因（筛选区里那一格与"我要找的单据"没有关系）。
 * 这类"看不懂候选为什么变少"的筛选一律走这份显式排除，而不是靠"接口不支持所以不显示"。</p>
 */
export const DEFAULT_SELECTOR_FILTER_OMISSIONS: readonly string[] = [
  'referencedBy',
]

const parentCandidateFilterContracts: Record<
  ParentCandidateSource,
  ParentCandidateFilterContract
> = {
  'purchase-order-import': {
    nativeFilterKeys: [
      'keyword',
      'supplierId',
      'supplierName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      orderDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'sales-order-purchase-source': {
    nativeFilterKeys: [
      'keyword',
      'supplierId',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentSalesOrderId',
    ],
    dateRangeMapping: {
      orderDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'sales-order-outbound-import': {
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      deliveryDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'freight-sales-order-import': {
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      deliveryDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'customer-statement': {
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      deliveryDate: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
  'freight-statement': {
    nativeFilterKeys: [
      'keyword',
      'carrierId',
      'carrierCode',
      'carrierName',
      'settlementCompanyId',
      'startDate',
      'endDate',
      'currentRecordId',
    ],
    dateRangeMapping: {
      billTime: { startKey: 'startDate', endKey: 'endDate' },
    },
  },
}

export function getParentCandidateFilterContract(
  source: ParentCandidateSource,
) {
  return parentCandidateFilterContracts[source]
}

/**
 * 某个候选来源在导入弹层里**显式排除**的筛选项（缺省用六个来源共用的语义排除项）。
 *
 * <p>这是弹层筛选「默认全放行」之外唯一会减少筛选格子的语义来源；
 * 另一个减少来源是 {@link ParentCandidateFilterContract.nativeFilterKeys} 的接口能力守卫
 * （接口不接受的 key 显示了也没用，用户改了筛选却不生效）。</p>
 */
export function getParentCandidateSelectorOmissions(
  source: ParentCandidateSource,
): readonly string[] {
  return (
    parentCandidateFilterContracts[source].selectorFilterOmissions ??
    DEFAULT_SELECTOR_FILTER_OMISSIONS
  )
}
