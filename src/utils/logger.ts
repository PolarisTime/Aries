type LogLevel = 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: string
  details?: unknown
  timestamp: string
}

const MAX_RECENT_LOGS = 50
const recentLogs: LogEntry[] = []

function emit(level: LogLevel, message: string, details?: unknown) {
  const entry: LogEntry = {
    level,
    message,
    details,
    timestamp: new Date().toISOString(),
  }
  recentLogs.push(entry)
  if (recentLogs.length > MAX_RECENT_LOGS) {
    recentLogs.shift()
  }
  const fn = level === 'error' ? console.error : console.warn
  fn(`[${entry.timestamp}] ${message}`, details ?? '')
}

export const logger = {
  warn(message: string, details?: unknown) {
    emit('warn', message, details)
  },

  error(message: string, details?: unknown) {
    emit('error', message, details)
  },

  getRecentLogs(): readonly LogEntry[] {
    return recentLogs
  },

  clearRecentLogs() {
    recentLogs.length = 0
  },
}
