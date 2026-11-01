import { describe, expect, it } from 'vitest'
import { buildFilterParamsFromContract } from '@/api/business/business-listing-filtering'
import { buildCustomerStatementParentFilters } from '@/config/business-pages/finance/customer-statement-rules'
import { buildFreightStatementParentFilters } from '@/config/business-pages/finance/freight-statement-rules'
import {
  getParentCandidateFilterContract,
  type ParentCandidateSource,
} from './parent-candidate-contracts'

/**
 * 候选接口参数契约一致性门禁。
 *
 * <p>前端 `nativeFilterKeys` 是「哪些筛选值能变成候选接口 query 参数」的唯一镜像：
 * 写错一个 key 不会报错，`buildFilterParamsFromContract` 会把它丢掉，界面表现为
 * 「筛选改了没反应」或「本单自身没被排除」。历史真实事故：两个对账单来源发
 * `currentRecordId`，而后端实参是 `currentStatementId`，于是本单已包含的销售订单
 * 重新出现在候选里。</p>
 *
 * <p>下面的「后端实参」逐个抄自后端 controller/询参 DTO（锁定版本见注释），
 * 断言方向是**单向包含**：前端只能更窄（少发），不能比后端更宽（发不存在的参数）。</p>
 */
const BACKEND_ACCEPTED_PARAMS: Record<
  ParentCandidateSource,
  readonly string[]
> = {
  // V2PurchaseOrderController#inboundImportCandidates
  'purchase-order-import': [
    'keyword',
    'supplierId',
    'supplierName',
    'settlementCompanyId',
    'status',
    'startDate',
    'endDate',
    'currentRecordId',
  ],
  // V2SalesOrderController#sourceCandidates
  'sales-order-purchase-source': [
    'keyword',
    'supplierId',
    'settlementCompanyId',
    'startDate',
    'endDate',
    'currentSalesOrderId',
  ],
  // V2SalesOrderController#outboundImportCandidates（SalesOrderOutboundImportCandidatesCriteria）
  'sales-order-outbound-import': [
    'keyword',
    'customerId',
    'customerName',
    'projectId',
    'projectName',
    'settlementCompanyId',
    'status',
    'startDate',
    'endDate',
    'currentRecordId',
  ],
  // V2FreightBillController#salesOrderCandidates
  'freight-sales-order-import': [
    'keyword',
    'customerId',
    'customerName',
    'projectId',
    'projectName',
    'settlementCompanyId',
    'status',
    'startDate',
    'endDate',
    'currentRecordId',
  ],
  // V2CustomerStatementController#candidates
  'customer-statement': [
    'keyword',
    'customerId',
    'customerName',
    'projectId',
    'projectName',
    'settlementCompanyId',
    'startDate',
    'endDate',
    'currentStatementId',
  ],
  // FreightStatementCandidatesCriteria（V2FreightStatementController#candidates）
  'freight-statement': [
    'keyword',
    'carrierId',
    'carrierCode',
    'carrierName',
    'settlementCompanyId',
    'startDate',
    'endDate',
    'currentStatementId',
  ],
}

const ALL_SOURCES = Object.keys(
  BACKEND_ACCEPTED_PARAMS,
) as ParentCandidateSource[]

describe('parent-candidate-contracts 与后端候选接口参数一致', () => {
  it.each(ALL_SOURCES)('%s：前端筛选 key 全部是后端接受的参数', (source) => {
    const contract = getParentCandidateFilterContract(source)
    const backend = new Set(BACKEND_ACCEPTED_PARAMS[source])
    const unknownKeys = (contract.nativeFilterKeys ?? []).filter(
      (key) => !backend.has(key),
    )
    expect(
      unknownKeys,
      `这些 key 会被后端静默忽略：${unknownKeys.join(', ')}`,
    ).toEqual([])
  })

  it.each(ALL_SOURCES)('%s：日期区间映射的两端都是后端参数', (source) => {
    const contract = getParentCandidateFilterContract(source)
    const backend = new Set(BACKEND_ACCEPTED_PARAMS[source])
    for (const mapping of Object.values(contract.dateRangeMapping ?? {})) {
      expect(backend.has(mapping.startKey)).toBe(true)
      expect(backend.has(mapping.endKey)).toBe(true)
    }
  })

  it.each(ALL_SOURCES)('%s：契约里的 key 能真正变成请求参数', (source) => {
    const contract = getParentCandidateFilterContract(source)
    const nativeFilterKeys = contract.nativeFilterKeys ?? []
    const search = Object.fromEntries(nativeFilterKeys.map((key) => [key, 'v']))
    const params = buildFilterParamsFromContract(contract, search)
    for (const key of nativeFilterKeys) {
      expect(params[key], `${key} 被过滤掉了`).toBe('v')
    }
  })

  it('两个对账单来源用 currentStatementId 排除本单，不再发 currentRecordId', () => {
    for (const source of ['customer-statement', 'freight-statement'] as const) {
      const contract = getParentCandidateFilterContract(source)
      expect(contract.nativeFilterKeys ?? []).toContain('currentStatementId')
      expect(contract.nativeFilterKeys ?? []).not.toContain('currentRecordId')
    }
  })

  it('过滤器实际产出的 key 都在契约内（builder 与契约不漂移）', () => {
    const cases: Array<{
      source: ParentCandidateSource
      filters: Record<string, unknown>
    }> = [
      {
        source: 'customer-statement',
        filters: buildCustomerStatementParentFilters({
          id: '1932500000000000001',
          customerId: '1932500000000000002',
          projectId: '1932500000000000003',
        }),
      },
      {
        source: 'freight-statement',
        filters: buildFreightStatementParentFilters({
          id: '1932500000000000001',
          carrierId: '1932500000000000002',
          settlementCompanyId: '1932500000000000003',
        }),
      },
    ]

    for (const { source, filters } of cases) {
      const contract = getParentCandidateFilterContract(source)
      const contractKeys = new Set(contract.nativeFilterKeys)
      const unknownKeys = Object.entries(filters)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key]) => key)
        .filter((key) => !contractKeys.has(key))
      expect(
        unknownKeys,
        `${source} 的 buildParentFilters 产出了契约外的 key：${unknownKeys.join(', ')}`,
      ).toEqual([])
    }
  })
})
