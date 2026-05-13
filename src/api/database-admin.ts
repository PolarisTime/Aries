import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { asString, asNumber } from '@/utils/type-narrowing'

// ── 类型（数据库管理专用，暂保留手动定义 — 后续迁移至 shared/schemas） ──

export interface PostgresStatus {
  host: string; port: number; database: string; version: string
  totalConnections: number; activeConnections: number; maxConnections: number
  databaseSize: string; tableCount: number; serverStartTime: string | null; status: string
}
export interface RedisStatus {
  host: string; port: number; database: number; version: string
  usedMemory: number; usedMemoryPeak: number; totalKeys: number
  connectedClients: number; uptime: string; hitCount: number; missCount: number; hitRate: number; status: string
}
export interface DatabaseStatus { postgres: PostgresStatus; redis: RedisStatus }
export interface DatabaseExportTask {
  id: string; taskNo: string; status: string; fileName?: string; fileSize?: number
  failureReason?: string; createdAt?: string; finishedAt?: string; expiresAt?: string; downloadUrl?: string
}
export interface DatabaseExportDownloadLink { downloadUrl: string; expiresAt?: string }

// ── 内部 ────────────────────────────────────────────────

interface DatabaseResponse<T> { code: number; message?: string; data: T }

function totpHeaders(totpCode: string) {
  return { 'X-TOTP-Code': totpCode.trim() }
}

function normalizeTask(raw: Record<string, unknown>): DatabaseExportTask {
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

export async function getDatabaseStatus() {
  const r = assertApiSuccess(
    await http.get<DatabaseResponse<DatabaseStatus>>(ENDPOINTS.DATABASE_STATUS),
    '加载数据库状态失败',
  )
  return r.data
}

export async function createDatabaseExportTask(totpCode: string) {
  const r = assertApiSuccess(
    await http.post<DatabaseResponse<Record<string, unknown>>>(ENDPOINTS.DATABASE_EXPORT_TASKS, null, {
      headers: totpHeaders(totpCode),
    }),
    '提交数据库导出任务失败',
  )
  return normalizeTask(r.data || {})
}

export async function listDatabaseExportTasks() {
  const r = assertApiSuccess(
    await http.get<DatabaseResponse<Record<string, unknown>[]>>(ENDPOINTS.DATABASE_EXPORT_TASKS),
    '加载数据库导出任务失败',
  )
  return Array.isArray(r.data) ? r.data.map(normalizeTask) : []
}

export async function generateDatabaseExportDownloadLink(taskId: string) {
  const r = assertApiSuccess(
    await http.post<DatabaseResponse<Record<string, unknown>>>(
      `${ENDPOINTS.DATABASE_EXPORT_TASKS}/${encodeURIComponent(taskId)}/download-link`,
    ),
    '生成下载链接失败',
  )
  return {
    downloadUrl: asString(r.data?.downloadUrl),
    expiresAt: r.data?.expiresAt ? asString(r.data.expiresAt) : undefined,
  }
}

export async function importDatabaseBackup(
  file: File, totpCode: string, databaseUsername: string, databasePassword: string,
) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('databaseUsername', databaseUsername.trim())
  fd.append('databasePassword', databasePassword)
  return assertApiSuccess(
    await http.post<DatabaseResponse<null>>(ENDPOINTS.DATABASE_IMPORT, fd, {
      headers: { 'Content-Type': 'multipart/form-data', ...totpHeaders(totpCode) },
    }),
    '导入数据库备份失败',
  )
}
