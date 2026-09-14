import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  type SalesOrderDocumentFlow,
  salesOrderDocumentFlowSchema,
} from '@/shared/schemas/sales-order-document-flow'
import type { EntityId } from '@/types/entity-id'

/** 统一单据流：订单 → 出库 → 退货 → 对账 → 收款。 */
export function getSalesOrderDocumentFlow(
  id: EntityId,
  signal?: AbortSignal,
): Promise<SalesOrderDocumentFlow> {
  return apiGet(
    ENDPOINTS.SALES_ORDER_DOCUMENT_FLOW(id),
    salesOrderDocumentFlowSchema,
    {
      signal,
    },
  )
}
