import type { AxiosRequestConfig } from 'axios'
import { normalizeRows } from '@/api/business/business-normalizers'
import {
  getModuleConfig,
  type QueryValue,
} from '@/api/contracts/module-contracts'
import { apiGet } from '@/api/core/client'
import {
  pageContent,
  pageHasMore,
  pageLast,
  pageTotalElements,
  pageTotalPages,
} from '@/api/core/page-contract'
import { rawRecordPageSchema } from '@/shared/schemas/api'
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
    const response = await apiGet(
      endpointConfig.path,
      mainFlowResponseSchema,
      requestConfig,
    )

    return {
      rows: response.content,
      totalElements: response.totalElements,
      totalPages: Math.max(response.totalPages, 1),
      last: !response.hasMore,
      hasMore: response.hasMore,
    }
  }

  const response = await apiGet(
    endpointConfig.path,
    rawRecordPageSchema,
    requestConfig,
  )

  return {
    rows: normalizeRows(pageContent(response)),
    totalElements: pageTotalElements(response),
    totalPages: pageTotalPages(response),
    last: pageLast(response),
    hasMore: pageHasMore(response),
  }
}
