import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'

/** 操作日志类别：会话（登录/刷新）/ 业务 / 系统。 */
export type OperationLogCategory = 'SESSION' | 'BUSINESS' | 'SYSTEM'

export type OperationLogRecord = {
  id: EntityId
  logNo: string
  operatorName: string
  loginName: string
  authType?: string
  moduleName: string
  actionType: string
  businessNo?: string
  recordId?: EntityId
  requestMethod: string
  requestPath: string
  clientIp?: string
  resultStatus: string
  operationTime: string
  remark?: string
  /** 以下字段来自 V199 之后的新记录；历史数据为空。 */
  statusCode?: number
  durationMs?: number
  userAgent?: string
  errorCode?: string
  errorMessage?: string
  requestBody?: unknown
  operationCategory?: string
  traceId?: string
}

export type OperationLogFilters = {
  keyword?: string
  moduleName?: string
  actionType?: string
  resultStatus?: string
  operatorName?: string
  businessNo?: string
  category?: string
  minDurationMs?: number
  /** ISO 日期（YYYY-MM-DD），闭区间。 */
  startTime?: string
  endTime?: string
}

export type OperationLogSummary = {
  total: number
  successCount: number
  failedCount: number
  avgDurationMs: number
  byDay: { date: string; total: number; failed: number }[]
  topFailedModules: { moduleName: string; count: number }[]
}

const numberLike = z.union([z.number(), z.string()])

const logSchema = z.looseObject({
  id: z.unknown(),
  logNo: z.string().nullish(),
  operatorName: z.string().nullish(),
  loginName: z.string().nullish(),
  authType: z.string().nullish(),
  moduleName: z.string().nullish(),
  actionType: z.string().nullish(),
  businessNo: z.string().nullish(),
  recordId: z.unknown().optional(),
  requestMethod: z.string().nullish(),
  requestPath: z.string().nullish(),
  clientIp: z.string().nullish(),
  resultStatus: z.string().nullish(),
  operationTime: z.string().nullish(),
  remark: z.string().nullish(),
  statusCode: numberLike.nullish(),
  durationMs: numberLike.nullish(),
  userAgent: z.string().nullish(),
  errorCode: z.string().nullish(),
  errorMessage: z.string().nullish(),
  requestBody: z.unknown().optional(),
  operationCategory: z.string().nullish(),
  traceId: z.string().nullish(),
})

const pageSchema = z.looseObject({
  content: z.array(logSchema).nullish(),
  totalElements: numberLike.nullish(),
  totalPages: numberLike.nullish(),
  currentPage: numberLike.nullish(),
  pageSize: numberLike.nullish(),
  hasMore: z.boolean().nullish(),
})

const summarySchema = z.looseObject({
  total: numberLike.nullish(),
  successCount: numberLike.nullish(),
  failedCount: numberLike.nullish(),
  avgDurationMs: numberLike.nullish(),
  byDay: z
    .array(
      z.looseObject({
        date: z.string().nullish(),
        total: numberLike.nullish(),
        failed: numberLike.nullish(),
      }),
    )
    .nullish(),
  topFailedModules: z
    .array(
      z.looseObject({
        moduleName: z.string().nullish(),
        count: numberLike.nullish(),
      }),
    )
    .nullish(),
})

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeRecord(raw: z.infer<typeof logSchema>): OperationLogRecord {
  const duration = toNumber(raw.durationMs)
  const status = toNumber(raw.statusCode)
  return {
    id:
      raw.id === undefined || raw.id === null
        ? ''
        : parseEntityId(raw.id, 'log.id'),
    logNo: raw.logNo ?? '',
    operatorName: raw.operatorName ?? '',
    loginName: raw.loginName ?? '',
    moduleName: raw.moduleName ?? '',
    actionType: raw.actionType ?? '',
    requestMethod: raw.requestMethod ?? '',
    requestPath: raw.requestPath ?? '',
    resultStatus: raw.resultStatus ?? '',
    operationTime: raw.operationTime ?? '',
    ...(raw.authType ? { authType: raw.authType } : {}),
    ...(raw.businessNo ? { businessNo: raw.businessNo } : {}),
    ...(raw.recordId !== undefined && raw.recordId !== null
      ? { recordId: parseEntityId(raw.recordId, 'log.recordId') }
      : {}),
    ...(raw.clientIp ? { clientIp: raw.clientIp } : {}),
    ...(raw.remark ? { remark: raw.remark } : {}),
    ...(duration !== undefined ? { durationMs: duration } : {}),
    ...(status !== undefined ? { statusCode: status } : {}),
    ...(raw.userAgent ? { userAgent: raw.userAgent } : {}),
    ...(raw.errorCode ? { errorCode: raw.errorCode } : {}),
    ...(raw.errorMessage ? { errorMessage: raw.errorMessage } : {}),
    ...(raw.requestBody !== undefined && raw.requestBody !== null
      ? { requestBody: raw.requestBody }
      : {}),
    ...(raw.operationCategory
      ? { operationCategory: raw.operationCategory }
      : {}),
    ...(raw.traceId ? { traceId: raw.traceId } : {}),
  }
}

export type OperationLogPage = {
  content: OperationLogRecord[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
}

export type OperationLogQuery = OperationLogFilters & {
  page: number
  size: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

const filterParams = (filters: OperationLogFilters) => ({
  ...(filters.keyword ? { keyword: filters.keyword } : {}),
  ...(filters.moduleName ? { moduleName: filters.moduleName } : {}),
  ...(filters.actionType ? { actionType: filters.actionType } : {}),
  ...(filters.resultStatus ? { resultStatus: filters.resultStatus } : {}),
  ...(filters.operatorName ? { operatorName: filters.operatorName } : {}),
  ...(filters.businessNo ? { businessNo: filters.businessNo } : {}),
  ...(filters.category ? { category: filters.category } : {}),
  ...(filters.minDurationMs !== undefined
    ? { minDurationMs: filters.minDurationMs }
    : {}),
  ...(filters.startTime ? { startTime: filters.startTime } : {}),
  ...(filters.endTime ? { endTime: filters.endTime } : {}),
})

/** 分页查询操作日志（默认按时间倒序）。 */
export async function fetchOperationLogs(
  query: OperationLogQuery,
  signal?: AbortSignal,
): Promise<OperationLogPage> {
  const response = await apiGet(ENDPOINTS.OPERATION_LOGS, pageSchema, {
    params: {
      ...filterParams(query),
      page: query.page,
      size: query.size,
      ...(query.sortBy ? { sortBy: query.sortBy } : {}),
      ...(query.direction ? { direction: query.direction } : {}),
    },
    ...(signal ? { signal } : {}),
  })
  return {
    content: (response.content ?? []).map(normalizeRecord),
    totalElements: toNumber(response.totalElements) ?? 0,
    totalPages: toNumber(response.totalPages) ?? 0,
    currentPage: toNumber(response.currentPage) ?? 0,
    pageSize: toNumber(response.pageSize) ?? query.size,
    hasMore: Boolean(response.hasMore),
  }
}

/** 概览指标 + 按天趋势 + 失败模块 Top5（同一批筛选条件）。 */
export async function fetchOperationLogSummary(
  filters: OperationLogFilters,
  signal?: AbortSignal,
): Promise<OperationLogSummary> {
  const response = await apiGet(
    ENDPOINTS.OPERATION_LOGS_SUMMARY,
    summarySchema,
    { params: filterParams(filters), ...(signal ? { signal } : {}) },
  )
  return {
    total: toNumber(response.total) ?? 0,
    successCount: toNumber(response.successCount) ?? 0,
    failedCount: toNumber(response.failedCount) ?? 0,
    avgDurationMs: toNumber(response.avgDurationMs) ?? 0,
    byDay: (response.byDay ?? []).flatMap((day) =>
      day.date
        ? [
            {
              date: day.date,
              total: toNumber(day.total) ?? 0,
              failed: toNumber(day.failed) ?? 0,
            },
          ]
        : [],
    ),
    topFailedModules: (response.topFailedModules ?? []).flatMap((item) =>
      item.moduleName
        ? [{ moduleName: item.moduleName, count: toNumber(item.count) ?? 0 }]
        : [],
    ),
  }
}
