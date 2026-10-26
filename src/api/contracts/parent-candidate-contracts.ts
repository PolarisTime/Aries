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
 * <p><b>当前为空清单</b>：唯一的历史成员 `referencedBy`（被引用状态）已随该筛选整体下线，
 * 页面配置与接口契约里都不再有它，共享清单因此不再需要任何默认排除。
 * 机制本身保留 —— 某个候选来源若还要排除"候选条数莫名变少"这类筛选，仍通过
 * {@link ParentCandidateFilterContract.selectorFilterOmissions} 逐源追加，
 * 不要退回到"接口不支持所以不显示"的隐式行为。</p>
 */
export const DEFAULT_SELECTOR_FILTER_OMISSIONS: readonly string[] = []

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
