import { assertApiSuccess, http } from '@/api/client'
import { getModuleConfig } from '@/api/module-contracts'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'

interface PagePayload<T> {
  records: T[]
  totalElements: number
}

function normalizeRecord(record: Record<string, unknown>) {
  return {
    ...record,
    id: String(record.id ?? ''),
    items: Array.isArray(record.items)
      ? record.items.map((item) => ({
          ...(item as Record<string, unknown>),
          id: String((item as Record<string, unknown>).id ?? ''),
        }))
      : undefined,
  } as ModuleRecord
}

export async function listStatementCandidates(
  statementModuleKey:
    | 'supplier-statement'
    | 'customer-statement'
    | 'freight-statement',
  keyword = '',
  page = 0,
  size = 200,
) {
  const endpointConfig = getModuleConfig(statementModuleKey)
  const response = assertApiSuccess(
    await http.get<ApiResponse<PagePayload<Record<string, unknown>>>>(
      `${endpointConfig.path}/candidates`,
      {
        params: {
          keyword: keyword.trim(),
          page,
          size,
        },
      },
    ),
    '查询对账候选单据失败',
  )

  return {
    rows: Array.isArray(response.data?.records)
      ? response.data.records.map((item) => normalizeRecord(item))
      : [],
    total: Number(response.data?.totalElements ?? 0),
  }
}

export async function listAllStatementCandidates(
  statementModuleKey:
    | 'supplier-statement'
    | 'customer-statement'
    | 'freight-statement',
  keyword = '',
  pageSize = 200,
) {
  const rows: ModuleRecord[] = []
  let page = 0
  let total = 0

  while (true) {
    const current = await listStatementCandidates(
      statementModuleKey,
      keyword,
      page,
      pageSize,
    )
    if (page === 0) {
      total = current.total
    }
    rows.push(...current.rows)
    if (rows.length >= total || current.rows.length < pageSize) {
      break
    }
    page += 1
  }

  return rows
}
