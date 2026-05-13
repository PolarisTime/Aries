import type { TableResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import { MAX_CLIENT_FILTER_ROWS } from './business-listing-constants'

export function buildTableResponse(
  rows: ModuleRecord[],
  total: number,
  truncated = false,
): TableResponse<ModuleRecord> {
  return {
    code: truncated ? 4000 : 0,
    message: truncated
      ? `结果不完整：已达客户端过滤上限 ${MAX_CLIENT_FILTER_ROWS} 条。请缩小筛选范围或联系管理员启用服务端过滤。`
      : undefined,
    data: {
      rows,
      total,
    },
  }
}
