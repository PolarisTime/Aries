import { createAndDownloadExportArtifact } from '@/api/core/export-artifacts'
import { ENDPOINTS } from '@/constants/endpoints'

/**
 * 套打导出请求体。
 *
 * <p>字段与后端 `SalesOrderPrintXlsxRequest` 对齐：只有可选的打印选项，
 * 转换/校验全部由服务端负责。这里不复用打印模板模块的类型，避免把「导出产物」
 * 与「打印渲染」两个契约耦合在同一个类型上。</p>
 */
export interface SalesOrderPrintXlsxExportPayload {
  printOptions?: unknown
}

/**
 * 导出销售订单套打 XLSX（两步：POST `/sales-orders/{orderId}/xlsx-export-requests`
 * → GET `/sales-orders/{orderId}/xlsx-export-requests/{exportId}/content`）。
 *
 * <p>套打导出产物从属于销售订单（`parentType=sales-order`），请求体可省略打印选项。
 * 产物保留 30 分钟，过期或服务端重启后下载返回 404，由统一的两步导出实现提示重新生成。</p>
 */
export async function exportSalesOrderPrintXlsx(
  recordId: string,
  payload: SalesOrderPrintXlsxExportPayload = {},
  idempotencyKey?: string,
): Promise<void> {
  await createAndDownloadExportArtifact(
    ENDPOINTS.SALES_ORDER_XLSX_EXPORT_REQUESTS(recordId),
    payload,
    {
      idempotencyKey,
      fallbackFileName: `sales-order-print-${recordId}.xlsx`,
    },
  )
}
