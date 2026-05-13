import { describe, expect, it } from 'vitest'
import { logger } from '@/utils/logger'

describe('logger', () => {
  it('buffers recent logs up to the max', () => {
    logger.clearRecentLogs()
    for (let i = 0; i < 60; i++) {
      logger.warn(`message ${i}`)
    }
    const logs = logger.getRecentLogs()
    expect(logs.length).toBeLessThanOrEqual(50)
  })

  it('includes timestamp in log entries', () => {
    logger.clearRecentLogs()
    logger.error('test error', { detail: 1 })
    const logs = logger.getRecentLogs()
    expect(logs.length).toBe(1)
    expect(logs[0].level).toBe('error')
    expect(logs[0].message).toBe('test error')
    expect(logs[0].details).toEqual({ detail: 1 })
    expect(logs[0].timestamp).toBeTruthy()
  })

  it('clearRecentLogs empties the buffer', () => {
    logger.warn('test')
    logger.clearRecentLogs()
    expect(logger.getRecentLogs().length).toBe(0)
  })
})
