import { businessPageConfigs } from '@/config/business-pages'
import { assertApiSuccess, http, restDelete } from '@/api/client'
import {
  getModuleConfig,
  type ModuleEndpointConfig,
  type QueryValue,
} from '@/api/module-contracts'
import { serializeBusinessRecordForSave } from '@/api/module-save-payload'
import type { TableResponse } from '@/types/api'
import type {
  ModuleFilterDefinition,
  ModuleLineItem,
  ModuleRecord,
} from '@/types/module-page'
import type { ListQueryOptions } from '@/utils/list'

import type { ApiResponse } from '@/types/auth'

export interface UploadRulePayload {
  renamePattern: string
  status: string
  remark?: string
}

interface NumberRuleGenerateRecord {
  moduleKey: string
  generatedNo: string
}

export interface UploadRuleRecord {
  id: string
  moduleKey: string
  moduleName: string
  ruleCode: string
  ruleName: string
  renamePattern: string
  status: string
  remark?: string
  previewFileName?: string
}

export interface AttachmentRecord {
  id: string
  name: string
  fileName: string
  originalFileName?: string
  contentType?: string
  fileSize?: number
  sourceType?: string
  uploader?: string
  uploadTime?: string
  previewSupported?: boolean
  previewType?: string
  previewUrl?: string
  downloadUrl?: string
}

export async function generateBusinessPrimaryNo(moduleKey: string) {
  const response = assertApiSuccess(
    await http.post('/general-settings/number-rules/next', null, {
      params: { moduleKey },
    }) as unknown as ApiResponse<NumberRuleGenerateRecord>,
    '生成单号失败',
  )
  return String(response.data?.generatedNo || '')
}

interface AttachmentBindingRecord {
  moduleKey: string
  recordId: string
  attachments: AttachmentRecord[]
}

interface LeoPageData<T> {
  records: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

const FULL_SCAN_PAGE_SIZE = 200

const REPORTED_CLIENT_FILTER_SIGNATURES = new Set<string>()

function toArray<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value : []
}

function normalizeLineItem(item: Record<string, unknown>) {
  return Object.entries(item).reduce<ModuleLineItem>(
    (result, [key, value]) => {
      if (key === 'id' || key === 'lineNo') {
        result[key] = value == null ? '' : String(value)
        return result
      }
      result[key] = value as never
      return result
    },
    { id: String(item.id ?? item.lineNo ?? '') },
  )
}

function normalizeRecord(record: Record<string, unknown>) {
  const normalized: ModuleRecord = {
    ...record,
    id: String(record.id ?? ''),
  }

  if (Array.isArray(record.items)) {
    normalized.items = record.items.map((item) =>
      normalizeLineItem(item as Record<string, unknown>),
    )
  }

  return normalized
}

function normalizeRows(rows: unknown[] | undefined) {
  return toArray(rows).map((record) =>
    normalizeRecord(record as Record<string, unknown>),
  )
}

function shouldClientFilter(
  moduleKey: string,
  search: Record<string, unknown>,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  const keys = Object.keys(search).filter((key) => hasValue(search[key]))
  return keys.some((key) => !isServerFilterKey(endpointConfig, key))
}

function isServerFilterKey(endpointConfig: ModuleEndpointConfig, key: string) {
  return Boolean(
    endpointConfig.nativeFilterKeys?.includes(key) ||
    endpointConfig.dateRangeMapping?.[key],
  )
}

function hasValue(value: unknown) {
  if (value == null) {
    return false
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.every(Boolean)
  }
  return true
}

function buildFilterParams(moduleKey: string, search: Record<string, unknown>) {
  const endpointConfig = getModuleConfig(moduleKey)
  const params: Record<string, QueryValue> = {}

  Object.entries(search).forEach(([key, value]) => {
    if (!hasValue(value)) {
      return
    }

    const dateRangeMapping = endpointConfig.dateRangeMapping?.[key]
    if (dateRangeMapping && Array.isArray(value) && value.length === 2) {
      params[dateRangeMapping.startKey] = String(value[0] || '')
      params[dateRangeMapping.endKey] = String(value[1] || '')
      return
    }

    if (isServerFilterKey(endpointConfig, key)) {
      params[key] = Array.isArray(value) ? value.map(String) : String(value)
    }
  })

  return params
}

function getUnsupportedFilterKeys(
  moduleKey: string,
  search: Record<string, unknown>,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  return Object.keys(search).filter(
    (key) => hasValue(search[key]) && !isServerFilterKey(endpointConfig, key),
  )
}

function reportClientFilterFallback(
  moduleKey: string,
  search: Record<string, unknown>,
) {
  const unsupportedKeys = getUnsupportedFilterKeys(moduleKey, search)
  if (unsupportedKeys.length === 0) {
    return
  }

  const signature = `${moduleKey}:${unsupportedKeys.sort().join(',')}`
  if (REPORTED_CLIENT_FILTER_SIGNATURES.has(signature)) {
    return
  }

  REPORTED_CLIENT_FILTER_SIGNATURES.add(signature)
  console.warn(
    `[business-api] ${moduleKey} fell back to client-side filtering for unsupported filters: ${unsupportedKeys.join(', ')}`,
  )

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('leo:client-filter-fallback', {
        detail: {
          moduleKey,
          unsupportedKeys,
        },
      }),
    )
  }
}

function buildQueryParams(
  moduleKey: string,
  search: Record<string, unknown>,
  options: ListQueryOptions,
  useClientFilter: boolean,
) {
  return {
    ...buildFilterParams(moduleKey, search),
    page: useClientFilter ? 0 : Math.max(options.currentPage - 1, 0),
    size: useClientFilter ? FULL_SCAN_PAGE_SIZE : options.pageSize,
  }
}

function applyFilterDefinition(
  record: ModuleRecord,
  filter: ModuleFilterDefinition,
  rawValue: unknown,
) {
  if (!hasValue(rawValue)) {
    return true
  }

  if (filter.type === 'input') {
    const keyword = String(rawValue || '')
      .trim()
      .toLowerCase()
    if (!keyword) {
      return true
    }
    return Object.values(record).some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(keyword),
    )
  }

  if (filter.type === 'select') {
    return String(record[filter.key] ?? '') === String(rawValue ?? '')
  }

  if (
    filter.type === 'dateRange' &&
    Array.isArray(rawValue) &&
    rawValue.length === 2
  ) {
    const [start, end] = rawValue
    const current = String(record[filter.key] ?? '')
    if (!current || !start || !end) {
      return true
    }
    return current >= String(start) && current <= String(end)
  }

  return true
}

function applyClientFilters(
  moduleKey: string,
  rows: ModuleRecord[],
  search: Record<string, unknown>,
) {
  const pageConfig = businessPageConfigs[moduleKey]
  if (!pageConfig) {
    return rows
  }

  return rows.filter((record) =>
    pageConfig.filters.every((filter) =>
      applyFilterDefinition(record, filter, search[filter.key]),
    ),
  )
}

function paginateRows(rows: ModuleRecord[], options: ListQueryOptions) {
  const start = Math.max(options.currentPage - 1, 0) * options.pageSize
  return rows.slice(start, start + options.pageSize)
}

function buildTableResponse(
  rows: ModuleRecord[],
  total: number,
): TableResponse<ModuleRecord> {
  return {
    code: 0,
    data: {
      rows,
      total,
    },
  }
}

async function fetchModulePage(
  moduleKey: string,
  params: Record<string, QueryValue>,
  page: number,
  size: number,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  const response = await http.get<
    ApiResponse<LeoPageData<Record<string, unknown>>>,
    ApiResponse<LeoPageData<Record<string, unknown>>>
  >(endpointConfig.path, {
    params: {
      ...params,
      page,
      size,
    },
  })

  return {
    rows: normalizeRows(response.data?.records),
    totalElements: Number(response.data?.totalElements ?? 0),
    totalPages: Math.max(Number(response.data?.totalPages ?? 1), 1),
    last: Boolean(response.data?.last),
  }
}

async function fetchAllModuleRows(
  moduleKey: string,
  search: Record<string, unknown>,
) {
  const filterParams = buildFilterParams(moduleKey, search)
  const allRows: ModuleRecord[] = []
  let page = 0

  while (true) {
    const current = await fetchModulePage(
      moduleKey,
      filterParams,
      page,
      FULL_SCAN_PAGE_SIZE,
    )
    allRows.push(...current.rows)

    if (current.last || page >= current.totalPages - 1) {
      break
    }

    page += 1
  }

  return allRows
}

export async function listBusinessModule(
  moduleKey: string,
  search: Record<string, unknown>,
  options: ListQueryOptions,
) {
  const useClientFilter = shouldClientFilter(moduleKey, search)
  if (useClientFilter) {
    reportClientFilterFallback(moduleKey, search)
    const rows = await fetchAllModuleRows(moduleKey, search)
    const filteredRows = applyClientFilters(moduleKey, rows, search)
    return buildTableResponse(
      paginateRows(filteredRows, options),
      filteredRows.length,
    )
  }

  const params = buildQueryParams(moduleKey, search, options, false)
  const current = await fetchModulePage(
    moduleKey,
    params,
    Number(params.page || 0),
    Number(params.size || options.pageSize),
  )
  return buildTableResponse(current.rows, current.totalElements)
}

export async function listAllBusinessModuleRows(
  moduleKey: string,
  search: Record<string, unknown>,
) {
  const useClientFilter = shouldClientFilter(moduleKey, search)
  if (useClientFilter) {
    reportClientFilterFallback(moduleKey, search)
  }
  const rows = await fetchAllModuleRows(moduleKey, search)
  return useClientFilter ? applyClientFilters(moduleKey, rows, search) : rows
}

export async function getBusinessModuleDetail(moduleKey: string, id: string) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持详情接口')
  }

  const response = await http.get<
    ApiResponse<Record<string, unknown>>,
    ApiResponse<Record<string, unknown>>
  >(`${endpointConfig.path}/${encodeURIComponent(id)}`)

  return {
    code: response.code,
    message: response.message,
    data: normalizeRecord(response.data || {}),
  }
}

export async function saveBusinessModule(
  moduleKey: string,
  record: ModuleRecord,
) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持保存')
  }

  const payload = serializeBusinessRecordForSave(moduleKey, record)
  const hasId = Boolean(record.id)
  const response = hasId
    ? await http.put<
        ApiResponse<Record<string, unknown>>,
        ApiResponse<Record<string, unknown>>
      >(
        `${endpointConfig.path}/${encodeURIComponent(String(record.id))}`,
        payload,
      )
    : await http.post<
        ApiResponse<Record<string, unknown>>,
        ApiResponse<Record<string, unknown>>
      >(endpointConfig.path, payload)

  return {
    code: response.code,
    message: response.message,
    data: response.data ? normalizeRecord(response.data) : undefined,
  }
}

export async function uploadAttachment(
  file: File,
  moduleKey: string,
  sourceType = 'PAGE_UPLOAD',
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('moduleKey', moduleKey)
  formData.append('sourceType', sourceType)

  return http.post('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<ApiResponse<Record<string, unknown>>>
}

export async function getAttachmentBindings(
  moduleKey: string,
  recordId: string | number,
) {
  return http.get<
    ApiResponse<AttachmentBindingRecord>,
    ApiResponse<AttachmentBindingRecord>
  >('/attachments/bindings', {
    params: {
      moduleKey,
      recordId,
    },
  })
}

export async function updateAttachmentBindings(
  moduleKey: string,
  recordId: string | number,
  attachmentIds: Array<string | number>,
) {
  const normalizedAttachmentIds = attachmentIds
    .map((item) => String(item).trim())
    .filter((item) => /^\d+$/.test(item) && item !== '0')

  return http.put<
    ApiResponse<AttachmentBindingRecord>,
    ApiResponse<AttachmentBindingRecord>
  >('/attachments/bindings', {
    moduleKey,
    recordId: String(recordId).trim(),
    attachmentIds: normalizedAttachmentIds,
  })
}

export async function getPageUploadRule(moduleKey: string) {
  return http.get<
    ApiResponse<UploadRuleRecord>,
    ApiResponse<UploadRuleRecord>
  >('/general-settings/upload-rule', {
    params: {
      moduleKey,
    },
  })
}

export async function updatePageUploadRule(
  moduleKey: string,
  payload: UploadRulePayload,
) {
  return http.put<
    ApiResponse<UploadRuleRecord>,
    ApiResponse<UploadRuleRecord>
  >('/general-settings/upload-rule', payload, {
    params: {
      moduleKey,
    },
  })
}

export async function deleteBusinessModule(moduleKey: string, id: string) {
  const endpointConfig = getModuleConfig(moduleKey)
  if (endpointConfig.readOnly) {
    throw new Error('当前模块不支持删除')
  }

  return restDelete<ApiResponse<null>>(
    `${endpointConfig.path}/${encodeURIComponent(id)}`,
  )
}
