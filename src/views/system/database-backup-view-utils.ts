import type { DatabaseExportTask } from '@/api/database-admin'

export function isDatabaseTaskRunning(status: string) {
  return status === 'RUNNING' || status === 'PENDING'
}

export function formatTaskTime(value: string | undefined): string {
  return value || '--'
}

export function formatDatabaseDateTime(value: string | undefined | null): string {
  return value || '--'
}
