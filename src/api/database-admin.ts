/** @file-dynamic-ref:route — 数据库管理 API，由 DatabaseBackupView 等组件引用 */
import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { getApiMessage } from '@/utils/api-messages'
import { asNumber, asString } from '@/utils/type-narrowing'

// ── 类型（数据库管理专用，暂保留手动定义 — 后续迁移至 shared/schemas） ──

export interface PostgresStatus {
  host: string
  port: number
  database: string
  version: string
  totalConnections: number
  activeConnections: number
  maxConnections: number
  databaseSize: string
  tableCount: number
  serverStartTime: string | null
  status: string
}
export interface RedisStatus {
  host: string
  port: number
  database: number
  version: string
  usedMemory: number
  usedMemoryPeak: number
  totalKeys: number
  connectedClients: number
  uptime: string
  hitCount: number
  missCount: number
  hitRate: number
  status: string
}
export interface DatabaseStatus {
  postgres: PostgresStatus
  redis: RedisStatus
}
export interface DatabaseExportTask {
  id: string
  taskNo: string
  status: string
  fileName?: string
  fileSize?: number
  failureReason?: string
  createdAt?: string
  finishedAt?: string
  expiresAt?: string
  downloadUrl?: string
}
export interface DatabaseExportDownloadLink {
  downloadUrl: string
  expiresAt?: string
}

// ── 内部 ────────────────────────────────────────────────

interface DatabaseResponse<T> {
  code: number
  message?: string
  data: T
}

type RawDatabaseExportTask = {
  id?: string | number
  taskNo?: string
  status?: string
  fileName?: string
  fileSize?: number
  failureReason?: string
  createdAt?: string
  finishedAt?: string
  expiresAt?: string
  downloadUrl?: string
}

function totpHeaders(totpCode: string) {
  return { 'X-TOTP-Code': totpCode.trim() }
}

function normalizeTask(raw: RawDatabaseExportTask): DatabaseExportTask {
  return {
    id: asString(raw.id),
    taskNo: asString(raw.taskNo),
    status: asString(raw.status),
    fileName: raw.fileName ? asString(raw.fileName) : undefined,
    fileSize: raw.fileSize ? asNumber(raw.fileSize) : undefined,
    failureReason: raw.failureReason ? asString(raw.failureReason) : undefined,
    createdAt: raw.createdAt ? asString(raw.createdAt) : undefined,
    finishedAt: raw.finishedAt ? asString(raw.finishedAt) : undefined,
    expiresAt: raw.expiresAt ? asString(raw.expiresAt) : undefined,
    downloadUrl: raw.downloadUrl ? asString(raw.downloadUrl) : undefined,
  }
}

// ── 公开 API ────────────────────────────────────────────

export interface SlowQueryItem {
  queryPreview: string
  calls: number
  avgMs: number
  pctTotal: number
  cacheHitPct: number
}
export interface CacheItem {
  tableName: string
  heapCachePct: number
  idxCachePct: number
  hotUpdatePct: number
}
export interface BloatItem {
  tableName: string
  liveRows: number
  deadRows: number
  deadPct: number
  lastAutovacuum: string | null
}
export interface UnusedIndexItem {
  indexName: string
  tableName: string
  size: string
  scans: number
}
export interface PgMonitoring {
  topSlowQueries: SlowQueryItem[]
  cacheEfficiency: CacheItem[]
  tableBloat: BloatItem[]
  unusedIndexes: UnusedIndexItem[]
}

export async function getDatabaseStatus() {
  const r = assertApiSuccess(
    await http.get<DatabaseResponse<DatabaseStatus>>(ENDPOINTS.DATABASE_STATUS),
    getApiMessage('loadDatabaseStatusFailed'),
  )
  return r.data
}

export async function getPgMonitoring() {
  const r = assertApiSuccess(
    await http.get<DatabaseResponse<PgMonitoring>>(
      '/system/databases/monitoring',
    ),
    '获取 PG 监控数据失败',
  )
  return r.data
}

export async function createDatabaseExportTask(totpCode: string) {
  const r = assertApiSuccess(
    await http.post<DatabaseResponse<RawDatabaseExportTask>>(
      ENDPOINTS.DATABASE_EXPORT_TASKS,
      null,
      {
        headers: totpHeaders(totpCode),
      },
    ),
    getApiMessage('submitDatabaseExportTaskFailed'),
  )
  return normalizeTask(r.data || {})
}

export async function listDatabaseExportTasks() {
  const r = assertApiSuccess(
    await http.get<DatabaseResponse<RawDatabaseExportTask[]>>(
      ENDPOINTS.DATABASE_EXPORT_TASKS,
    ),
    getApiMessage('loadDatabaseExportTaskFailed'),
  )
  return Array.isArray(r.data) ? r.data.map(normalizeTask) : []
}

export async function generateDatabaseExportDownloadLink(taskId: string) {
  const r = assertApiSuccess(
    await http.post<DatabaseResponse<RawDatabaseExportTask>>(
      `${ENDPOINTS.DATABASE_EXPORT_TASKS}/${encodeURIComponent(taskId)}/download-link`,
    ),
    getApiMessage('generateDownloadLinkFailed'),
  )
  return {
    downloadUrl: asString(r.data?.downloadUrl),
    expiresAt: r.data?.expiresAt ? asString(r.data.expiresAt) : undefined,
  }
}

export async function importDatabaseBackup(
  file: File,
  totpCode: string,
  databaseUsername: string,
  databasePassword: string,
) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('databaseUsername', databaseUsername.trim())
  fd.append('databasePassword', databasePassword)
  return assertApiSuccess(
    await http.post<DatabaseResponse<null>>(ENDPOINTS.DATABASE_IMPORT, fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...totpHeaders(totpCode),
      },
    }),
    getApiMessage('importDatabaseBackupFailed'),
  )
}
