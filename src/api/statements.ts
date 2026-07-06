import { assertApiSuccess, http } from '@/api/client'
import { getModuleConfig } from '@/api/module-contracts'
import { pageContent, pageTotalElements } from '@/api/page-contract'
import type { ApiResponse, TableResponse } from '@/types/api'
import type {
  RawApiRecord,
  RawPagePayload,
  SearchParams,
} from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import { getApiMessage } from '@/utils/api-messages'
import { asId, asString } from '@/utils/type-narrowing'

export function normalizeRecord(raw: RawApiRecord): ModuleRecord {
  const id = asId(raw.id) || asString(raw.id)
  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => ({
        ...item,
        id: asId(item.id) || asString(item.id),
      }))
    : undefined
  return { ...raw, id, items }
}

type StatementModuleKey =
  | 'supplier-statement'
  | 'customer-statement'
  | 'freight-statement'

async function listStatementCandidates(
  statementModuleKey: StatementModuleKey,
  keyword = '',
  page = 0,
  size = 200,
  filters: SearchParams = {},
) {
  const endpointConfig = getModuleConfig(statementModuleKey)
  const response = assertApiSuccess(
    await http.get<ApiResponse<RawPagePayload>>(
      `${endpointConfig.path}/candidates`,
      { params: { ...filters, keyword: keyword.trim(), page, size } },
    ),
    getApiMessage('queryStatementCandidatesFailed'),
  )
  const content = pageContent(response.data)
  return {
    rows: content.map(normalizeRecord),
    total: pageTotalElements(response.data),
  }
}

export async function listAllStatementCandidates(
  statementModuleKey: StatementModuleKey,
  keyword = '',
  pageSize = 200,
  filters: SearchParams = {},
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
      filters,
    )
    if (page === 0) total = current.total
    rows.push(...current.rows)
    if (rows.length >= total || current.rows.length < pageSize) break
    page += 1
  }
  return rows
}

export async function listStatementCandidatePage(
  statementModuleKey: StatementModuleKey,
  filters: SearchParams,
  page: number,
  size: number,
): Promise<TableResponse<ModuleRecord>> {
  const current = await listStatementCandidates(
    statementModuleKey,
    asString(filters.keyword).trim(),
    page,
    size,
    filters,
  )
  return {
    code: 0,
    data: {
      rows: current.rows,
      total: current.total,
    },
  }
}
