import { captureFrontendLog } from '@/observability/sentry'

type LogLevel = 'warn' | 'error'

function emit(level: LogLevel, message: string, details?: unknown) {
  const timestamp = new Date().toISOString()
  const fn = level === 'error' ? console.error : console.warn
  fn(`[${timestamp}] ${message}`, details ?? '')
  captureFrontendLog(level, message, details)
}

export const logger = {
  warn(message: string, details?: unknown) {
    emit('warn', message, details)
  },

  error(message: string, details?: unknown) {
    emit('error', message, details)
  },
}
