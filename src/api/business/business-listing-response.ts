import type { TableResponse } from '@/types/api'

export function buildTableResponse<Row>(
  rows: Row[],
  total: number,
  hasMore?: boolean,
): TableResponse<Row> {
  return {
    code: 0,
    data: {
      rows,
      total,
      hasMore,
    },
  }
}
