import { assertApiSuccess, http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { getApiMessage } from '@/utils/api-messages'

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

interface DatabaseResponse<T> {
  code: number
  message?: string
  data: T
}

export type ApiNumeric = number | string

export interface PostgresOverview {
  totalConnections: ApiNumeric
  activeConnections: ApiNumeric
  idleInTransactionConnections: ApiNumeric
  lockWaitSessions: ApiNumeric
  blockedSessions: ApiNumeric
  longTransactions: ApiNumeric
  longestTransactionSeconds: ApiNumeric
  longestQuerySeconds: ApiNumeric
  xactCommit: ApiNumeric
  xactRollback: ApiNumeric
  deadlocks: ApiNumeric
  tempFiles: ApiNumeric
  tempBytes: ApiNumeric
  cacheHitRate: number
  databaseSize: string
  uptimeSeconds: ApiNumeric
}
export interface PostgresActivity {
  activeSessions: ApiNumeric
  idleInTransactionSessions: ApiNumeric
  lockWaitSessions: ApiNumeric
  blockedSessions: ApiNumeric
  longTransactions: ApiNumeric
  longestTransactionSeconds: ApiNumeric
  longestQuerySeconds: ApiNumeric
}
export interface PostgresTuningSettings {
  maxConnections: ApiNumeric
  totalConnections: ApiNumeric
  activeConnections: ApiNumeric
  hikariMaximumPoolSize: ApiNumeric
  hikariMinimumIdle: ApiNumeric
  hikariLeakDetectionThresholdMs: ApiNumeric
  statementTimeout: string
  idleInTransactionSessionTimeout: string
  lockTimeout: string
  trackIoTiming: string
  sharedBuffers: string
  effectiveCacheSize: string
  workMem: string
  maintenanceWorkMem: string
  maxWalSize: string
  checkpointTimeout: string
  pgStatStatementsTrack: string
}
export interface TableHealthItem {
  tableName: string
  liveRows: ApiNumeric
  deadRows: ApiNumeric
  deadPct: number
  seqScan: ApiNumeric
  idxScan: ApiNumeric
  nModSinceAnalyze: ApiNumeric
  heapCachePct: number
  vacuumTriggerRows: ApiNumeric
  analyzeTriggerRows: ApiNumeric
  lastAutovacuumAgeSeconds: ApiNumeric | null
  lastAutoanalyzeAgeSeconds: ApiNumeric | null
  autovacuumStatus: string
  autovacuumAdvice: string
  lastVacuum: string | null
  lastAutovacuum: string | null
  lastAnalyze: string | null
  lastAutoanalyze: string | null
}
export interface IndexHealthItem {
  indexName: string
  tableName: string
  size: string
  sizeBytes: ApiNumeric
  scans: ApiNumeric
  tuplesRead: ApiNumeric
  tuplesFetched: ApiNumeric
  valid: boolean
  unique: boolean
  primary: boolean
}
export interface QueryStatsItem {
  queryId: string
  queryPreview: string
  calls: ApiNumeric
  totalMs: number
  avgMs: number
  rows: ApiNumeric
  cacheHitPct: number
}
export interface QueryStats {
  available: boolean
  status: string
  items: QueryStatsItem[]
}
interface RedisMemoryItem {
  usedMemory: ApiNumeric
  usedMemoryPeak: ApiNumeric
  maxMemory: ApiNumeric
  fragmentationRatio: number
  evictedKeys: ApiNumeric
  expiredKeys: ApiNumeric
}
interface RedisClientItem {
  connectedClients: ApiNumeric
  blockedClients: ApiNumeric
  rejectedConnections: ApiNumeric
}
interface RedisThroughputItem {
  totalCommandsProcessed: ApiNumeric
  instantaneousOpsPerSec: ApiNumeric
  keyspaceHits: ApiNumeric
  keyspaceMisses: ApiNumeric
  hitRate: number
}
interface RedisKeyspaceItem {
  database: number
  keys: ApiNumeric
  expires: ApiNumeric
  avgTtlMs: ApiNumeric
}
interface RedisPersistenceItem {
  rdbLastSaveTime: ApiNumeric
  rdbLastBgsaveStatus: string
  aofEnabled: boolean
  aofLastBgrewriteStatus: string
}
export interface RedisMonitoring {
  memory: RedisMemoryItem
  clients: RedisClientItem
  throughput: RedisThroughputItem
  keyspace: RedisKeyspaceItem
  persistence: RedisPersistenceItem
  status: string
}
export interface DatabaseMonitoring {
  available: boolean
  status: string
  overview: PostgresOverview
  activity: PostgresActivity
  tuning: PostgresTuningSettings
  tableHealth: TableHealthItem[]
  indexHealth: IndexHealthItem[]
  queryStats: QueryStats
  redis: RedisMonitoring
}

export async function getDatabaseStatus() {
  const r = assertApiSuccess(
    await http.get<DatabaseResponse<DatabaseStatus>>(ENDPOINTS.DATABASE_STATUS),
    getApiMessage('loadDatabaseStatusFailed'),
  )
  return r.data
}

export async function getDatabaseMonitoring() {
  const r = assertApiSuccess(
    await http.get<DatabaseResponse<DatabaseMonitoring>>(
      ENDPOINTS.DATABASE_MONITORING,
    ),
    '获取数据库监控数据失败',
  )
  return r.data
}
