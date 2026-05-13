export function isDatabaseTaskRunning(status: string) {
  return status === '排队中' || status === '执行中'
}

export function formatDatabaseMemory(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatDatabaseDateTime(value?: string) {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 19)
}

export function formatDatabaseTaskStatusColor(status: string) {
  if (status === '已完成') return 'success'
  if (status === '失败' || status === '已过期') return 'error'
  if (status === '执行中') return 'processing'
  return 'default'
}
