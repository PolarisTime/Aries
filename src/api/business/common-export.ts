import { buildFilterParams } from '@/api/business/business-listing-filtering'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import { downloadPost, downloadPostResponse } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { SearchParams } from '@/types/api-raw'
import { downloadBlob, resolveDownloadFileName } from '@/utils/download'

/**
 * 服务端支持「按记录 id 集合」导出的业务单据模块。
 *
 * <p>必须与 leo 的 {@code ModuleExportCatalog} 登记集合保持一致：两端不一致时，
 * 后端会以 422（不支持的导出模块）拒绝，前端则回落到打印链路或明确提示。</p>
 */
export const RECORD_ID_EXPORT_MODULES = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'sales-return',
  'freight-bill',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
] as const

const recordIdExportModuleSet: ReadonlySet<string> = new Set(
  RECORD_ID_EXPORT_MODULES,
)

/**
 * 按 id 导出端点自己呈现错误的状态码。
 *
 * <p>调用方（「导出选中 N 条」）会读取 ProblemDetail 的 `detail` 并给出明确提示，
 * 因此抑制这几个状态码的全局提示，避免同一错误弹出两次。</p>
 */
const RECORD_ID_EXPORT_SUPPRESSED_STATUSES = [400, 403, 404, 422] as const

/** 该模块是否支持服务端按 id 集合导出 xlsx。 */
export function supportsRecordIdExport(module: string): boolean {
  return recordIdExportModuleSet.has(module)
}

/**
 * 按记录 id 集合导出业务单据（`POST /module-exports`）。
 *
 * <p>只提交勾选的雪花 ID 字符串，不做任何数值转换：`recordIds` 为十进制字符串数组，
 * 与后端 DTO 的 `List<Long>` + `SnowflakeIdStringDeserializer` 契约一致。</p>
 */
export async function exportModuleRecordsByIds(
  module: string,
  recordIds: string[],
): Promise<void> {
  const response = await downloadPostResponse(
    ENDPOINTS.MODULE_EXPORTS,
    { moduleKey: module, recordIds },
    {
      responseType: 'blob',
      suppressGlobalErrorStatuses: RECORD_ID_EXPORT_SUPPRESSED_STATUSES,
    },
  )
  downloadBlob(
    response.data,
    resolveDownloadFileName(
      response.headers?.['content-disposition'],
      `${module}-selected.xlsx`,
    ),
  )
}

export async function exportModuleData(
  module: string,
  params: SearchParams,
): Promise<void> {
  const exportParams = buildFilterParams(module, params)

  if (module === 'material') {
    const response = await downloadPost(
      ENDPOINTS.MATERIAL_EXPORTS,
      undefined,
      withIdempotencyKey({
        params: {
          keyword: exportParams.keyword ?? '',
          format: 'xlsx',
        },
      }),
    )
    downloadBlob(response, 'material.xlsx')
    return
  }

  const endpointConfig = getModuleConfig(module)
  const response = await downloadPost(
    `${endpointConfig.path}/export`,
    exportParams,
    withIdempotencyKey({
      params: exportParams,
    }),
  )
  downloadBlob(response, `${module}.xlsx`)
}
