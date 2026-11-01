import type { ModuleEndpointConfig } from '@/api/contracts/module-contract-types'
import type { ModuleKey } from '@/module-system/core/module-key'

/**
 * 运营类模块的**列表**端点契约（`GET /{path}`，对应后端 `V2*Controller.page(...)`）。
 *
 * <p><b>过滤键以 controller 方法参数为准</b>：`nativeFilterKeys` 是列表请求的查询参数白名单 ——
 * `buildFilterParams` 会把白名单外的 key 丢掉，`getUnsupportedFilterKeys` 遇到未登记的 key
 * 会直接抛错（见 `api/business/business-listing.ts`）。所以这里只能登记后端真正消费的参数，
 * 登记一个后端不读的 key 等于给用户一个「改了没反应」的死筛选。</p>
 *
 * <p>两类曾误加的 key，已按后端实现移除：</p>
 * <ul>
 *   <li>`currentRecordId`：只有**候选**端点支持（例如
 *     `V2SalesOrderController.outboundImportCandidates` 的
 *     `SalesOrderOutboundImportCandidatesCriteria.currentRecordId`），列表端点不消费；
 *     候选侧的白名单在 `parent-candidate-contracts.ts`，不要混回本文件。</li>
 *   <li>`salesOrderId`：`V2SalesReturnController.page` 没有该参数；销售退货的来源候选端点只接受
 *     `salesOutboundId`（`V2SalesReturnController.candidates`），登记了也只会被后端忽略。</li>
 * </ul>
 */
export const operationModuleEndpointContracts = {
  'purchase-order': {
    path: '/purchase-orders',
    nativeFilterKeys: [
      'keyword',
      'productKeyword',
      'supplierId',
      'supplierName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
      'pendingOnly',
    ],
    dateRangeMapping: {
      orderDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'purchase-inbound': {
    path: '/purchase-inbounds',
    nativeFilterKeys: [
      'keyword',
      'productKeyword',
      'supplierId',
      'supplierName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      inboundDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-order': {
    path: '/sales-orders',
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'productKeyword',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
      'pendingOnly',
    ],
    dateRangeMapping: {
      deliveryDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-outbound': {
    path: '/sales-outbounds',
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'productKeyword',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      outboundDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-return': {
    path: '/sales-returns',
    nativeFilterKeys: [
      'keyword',
      'productKeyword',
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      returnDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'freight-bill': {
    path: '/freight-bills',
    nativeFilterKeys: [
      'keyword',
      'productKeyword',
      'carrierId',
      'carrierCode',
      'carrierName',
      'customerId',
      'projectId',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      billTime: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
} satisfies Partial<Record<ModuleKey, ModuleEndpointConfig>>
