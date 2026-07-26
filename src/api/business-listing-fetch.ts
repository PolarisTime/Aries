import type { AxiosRequestConfig } from 'axios'
import { normalizeRows } from '@/api/business-normalizers'
import { apiGet, assertApiSuccess } from '@/api/client'
import { getModuleConfig, type QueryValue } from '@/api/module-contracts'
import {
  pageContent,
  pageHasMore,
  pageLast,
  pageTotalElements,
  pageTotalPages,
} from '@/api/page-contract'
import { rawPageResponseSchema } from '@/shared/schemas/api'
import {
  getMainFlowListResponseSchema,
  type MainFlowModuleKey,
} from '@/shared/schemas/module-record'
import type { SearchParams } from '@/types/api-raw'
import type {
  LegacyModuleRecord,
  MainFlowListRecord,
} from '@/types/module-record'

interface FetchedModulePage<Row> {
  rows: Row[]
  totalElements: number
  totalPages: number
  last: boolean
  hasMore: boolean
}

export function fetchModulePage<Key extends MainFlowModuleKey>(
  moduleKey: Key,
  params: Record<string, QueryValue>,
  page: number,
  size: number,
  config?: AxiosRequestConfig,
  fields?: string[],
): Promise<FetchedModulePage<MainFlowListRecord<Key>>>
export function fetchModulePage(
  moduleKey: string,
  params: Record<string, QueryValue>,
  page: number,
  size: number,
  config?: AxiosRequestConfig,
  fields?: string[],
): Promise<FetchedModulePage<LegacyModuleRecord>>
export async function fetchModulePage(
  moduleKey: string,
  params: Record<string, QueryValue>,
  page: number,
  size: number,
  config?: AxiosRequestConfig,
  fields?: string[],
): Promise<FetchedModulePage<LegacyModuleRecord>> {
  const endpointConfig = getModuleConfig(moduleKey)
  const requestConfig = {
    ...config,
    params: {
      ...params,
      page,
      size,
      ...(fields?.length
        ? {
            [endpointConfig.fieldsParam || 'fields']: fields.join(','),
          }
        : {}),
      ...(config?.params as SearchParams | undefined),
    },
  }
  const mainFlowResponseSchema = getMainFlowListResponseSchema(moduleKey)
  if (mainFlowResponseSchema) {
    const response = assertApiSuccess(
      await apiGet(endpointConfig.path, mainFlowResponseSchema, requestConfig),
      '查询业务列表失败',
    )

    return {
      rows: response.data.content,
      totalElements: response.data.totalElements,
      totalPages: Math.max(response.data.totalPages, 1),
      last: !response.data.hasMore,
      hasMore: response.data.hasMore,
    }
  }

  const response = assertApiSuccess(
    await apiGet(endpointConfig.path, rawPageResponseSchema, requestConfig),
    '查询业务列表失败',
  )

  return {
    rows: normalizeRows(pageContent(response.data)),
    totalElements: pageTotalElements(response.data),
    totalPages: pageTotalPages(response.data),
    last: pageLast(response.data),
    hasMore: pageHasMore(response.data),
  }
}
