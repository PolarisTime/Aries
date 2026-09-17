import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  type DocumentFlow,
  documentFlowSchema,
} from '@/shared/schemas/document-flow'

/** 按业务单号查询采购/销售/物流单据流向（后端自动识别单号类型）。 */
export function getDocumentFlow(
  documentNo: string,
  signal?: AbortSignal,
): Promise<DocumentFlow> {
  return apiGet(ENDPOINTS.DOCUMENT_FLOW, documentFlowSchema, {
    signal,
    params: { documentNo },
  })
}
