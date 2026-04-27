import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'

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

interface DatabaseResponse<T> {
  code: number
  message?: string
  data: T
}

function buildTotpHeaders(totpCode: string) {
  return {
    'X-TOTP-Code': totpCode.trim(),
  }
}

export async function getDatabaseStatus() {
  const response = assertApiSuccess(
    await http.get<DatabaseResponse<DatabaseStatus>>(ENDPOINTS.DATABASE_STATUS),
    '加载数据库状态失败',
  )
  return response.data
}

function normalizeTask(record: Record<string, unknown>): DatabaseExportTask {
  return {
    id: String(record.id || ''),
    taskNo: String(record.taskNo || ''),
    status: String(record.status || ''),
    fileName: record.fileName ? String(record.fileName) : '',
    fileSize: Number(record.fileSize || 0),
    failureReason: record.failureReason ? String(record.failureReason) : '',
    createdAt: record.createdAt ? String(record.createdAt) : '',
    finishedAt: record.finishedAt ? String(record.finishedAt) : '',
    expiresAt: record.expiresAt ? String(record.expiresAt) : '',
    downloadUrl: record.downloadUrl ? String(record.downloadUrl) : '',
  }
}

export async function createDatabaseExportTask(totpCode: string) {
  const response = assertApiSuccess(
    await http.post<DatabaseResponse<Record<string, unknown>>>(ENDPOINTS.DATABASE_EXPORT_TASKS, null, {
      headers: buildTotpHeaders(totpCode),
    }),
    '提交数据库导出任务失败',
  )
  return normalizeTask(response.data || {})
}

export async function listDatabaseExportTasks() {
  const response = assertApiSuccess(
    await http.get<DatabaseResponse<Record<string, unknown>[]>>(ENDPOINTS.DATABASE_EXPORT_TASKS),
    '加载数据库导出任务失败',
  )
  return Array.isArray(response.data) ? response.data.map((item) => normalizeTask(item)) : []
}

export async function generateDatabaseExportDownloadLink(taskId: string) {
  const response = assertApiSuccess(
    await http.post<DatabaseResponse<Record<string, unknown>>>(`${ENDPOINTS.DATABASE_EXPORT_TASKS}/${encodeURIComponent(taskId)}/download-link`),
    '生成下载链接失败',
  )
  return {
    downloadUrl: String(response.data?.downloadUrl || ''),
    expiresAt: response.data?.expiresAt ? String(response.data.expiresAt) : '',
  } as DatabaseExportDownloadLink
}

export async function importDatabaseBackup(file: File, totpCode: string, databaseUsername: string, databasePassword: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('databaseUsername', databaseUsername.trim())
  formData.append('databasePassword', databasePassword)

  return assertApiSuccess(
    await http.post<DatabaseResponse<null>>(ENDPOINTS.DATABASE_IMPORT, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...buildTotpHeaders(totpCode),
      },
    }),
    '导入数据库备份失败',
  )
}
