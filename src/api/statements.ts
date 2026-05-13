import { assertApiSuccess, http } from '@/api/client'
import { getModuleConfig } from '@/api/module-contracts'
import { asString, asId } from '@/utils/type-narrowing'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'

interface PagePayload<T> {
  records: T[]
  totalElements: number
}

function normalizeRecord(raw: Record<string, unknown>): ModuleRecord {
  const id = asId(raw.id) || asString(raw.id)
  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => {
        const it = item as Record<string, unknown>
        return { ...it, id: asId(it.id) || asString(it.id) }
      })
    : undefined
  return { ...raw, id, items }
}

type StatementModuleKey = 'supplier-statement' | 'customer-statement' | 'freight-statement'

export async function listStatementCandidates(
  statementModuleKey: StatementModuleKey,
  keyword = '',
  page = 0,
  size = 200,
) {
  const endpointConfig = getModuleConfig(statementModuleKey)
  const response = assertApiSuccess(
    await http.get<ApiResponse<PagePayload<Record<string, unknown>>>>(
      `${endpointConfig.path}/candidates`,
      { params: { keyword: keyword.trim(), page, size } },
    ),
    '查询对账候选单据失败',
  )
  return {
    rows: Array.isArray(response.data?.records)
      ? response.data.records.map(normalizeRecord)
      : [],
    total: Number(response.data?.totalElements ?? 0),
  }
}

export async function listAllStatementCandidates(
  statementModuleKey: StatementModuleKey,
  keyword = '',
  pageSize = 200,
) {
  const rows: ModuleRecord[] = []
  let page = 0
  let total = 0
  while (true) {
    const current = await listStatementCandidates(statementModuleKey, keyword, page, pageSize)
    if (page === 0) total = current.total
    rows.push(...current.rows)
    if (rows.length >= total || current.rows.length < pageSize) break
    page += 1
  }
  return rows
}
