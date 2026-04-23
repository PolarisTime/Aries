import { restDelete, restGet, restPost } from '@/api/client'
import type { TableResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import { buildListParams } from '@/utils/list'
import type { ListQueryOptions } from '@/utils/list'

export function listBusinessModule(
  moduleKey: string,
  search: Record<string, unknown>,
  options: ListQueryOptions,
) {
  return restGet<TableResponse<ModuleRecord>>(`/rest/modules/${moduleKey}`, buildListParams(search, options))
}

export function saveBusinessModule(
  moduleKey: string,
  record: ModuleRecord,
) {
  return restPost<{
    code: number
    data?: ModuleRecord
    message?: string
  }>(`/rest/modules/${moduleKey}/save`, record)
}

export function deleteBusinessModule(
  moduleKey: string,
  id: string,
) {
  return restDelete<{
    code: number
    message?: string
  }>(`/rest/modules/${moduleKey}/${encodeURIComponent(id)}`)
}
