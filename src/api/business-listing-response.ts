import type { TableResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import { getApiMessage } from '@/utils/api-messages'
import { MAX_CLIENT_FILTER_ROWS } from './business-listing-constants'

export function buildTableResponse(
  rows: ModuleRecord[],
  total: number,
  truncated = false,
  hasMore?: boolean,
): TableResponse<ModuleRecord> {
  return {
    code: truncated ? 4000 : 0,
    message: truncated
      ? `${getApiMessage('resultIncomplete')} (${MAX_CLIENT_FILTER_ROWS})`
      : undefined,
    data: {
      rows,
      total,
      hasMore,
    },
  }
}
