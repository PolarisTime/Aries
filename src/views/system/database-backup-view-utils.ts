import { formatBytes, formatDateTime } from '@/utils/formatters'

export function isDatabaseTaskRunning(status: string) {
  return status === '排队中' || status === '执行中'
}

export {
  formatBytes as formatDatabaseMemory,
  formatDateTime as formatDatabaseDateTime,
}

export function formatDatabaseTaskStatusColor(status: string) {
  if (status === '已完成') return 'success'
  if (status === '失败' || status === '已过期') return 'error'
  if (status === '执行中') return 'processing'
  return 'default'
}
