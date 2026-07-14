import { describe, expect, it } from 'vitest'

import {
  formatDatabaseDateTime,
  formatDatabaseMemory,
} from '@/views/system/database-backup-view-utils'

describe('database-backup-view-utils', () => {
  describe('formatDatabaseDateTime', () => {
    it('returns the value when provided', () => {
      expect(formatDatabaseDateTime('2024-01-01 12:00:00')).toBe(
        '2024-01-01 12:00:00',
      )
    })

    it('formats millisecond timestamps', () => {
      const localMillis = new Date(2024, 0, 1, 20, 0, 0).getTime()

      expect(formatDatabaseDateTime(String(localMillis))).toBe(
        '2024-01-01 20:00:00',
      )
    })

    it('returns "--" when value is null', () => {
      expect(formatDatabaseDateTime(null)).toBe('--')
    })

    it('returns "--" when value is undefined', () => {
      expect(formatDatabaseDateTime(undefined)).toBe('--')
    })

    it('returns "--" when value is empty string', () => {
      expect(formatDatabaseDateTime('')).toBe('--')
    })
  })

  describe('formatDatabaseMemory', () => {
    it('returns "0 B" for zero', () => {
      expect(formatDatabaseMemory(0)).toBe('0 B')
    })

    it('formats bytes correctly', () => {
      expect(formatDatabaseMemory(512)).toBe('512 B')
    })

    it('formats kilobytes correctly', () => {
      expect(formatDatabaseMemory(1024)).toBe('1.0 KB')
      expect(formatDatabaseMemory(1536)).toBe('1.5 KB')
    })

    it('formats megabytes correctly', () => {
      expect(formatDatabaseMemory(1048576)).toBe('1.0 MB')
    })

    it('formats gigabytes correctly', () => {
      expect(formatDatabaseMemory(1073741824)).toBe('1.0 GB')
    })

    it('formats terabytes correctly', () => {
      expect(formatDatabaseMemory(1099511627776)).toBe('1.0 TB')
    })

    it('handles string input', () => {
      expect(formatDatabaseMemory('1024')).toBe('1.0 KB')
    })

    it('returns "--" for empty string', () => {
      expect(formatDatabaseMemory('')).toBe('--')
    })

    it('returns "--" for null', () => {
      expect(formatDatabaseMemory(null)).toBe('--')
    })

    it('returns "--" for undefined', () => {
      expect(formatDatabaseMemory(undefined)).toBe('--')
    })

    it('returns "--" for negative numbers', () => {
      expect(formatDatabaseMemory(-1)).toBe('--')
    })

    it('returns "--" for NaN', () => {
      expect(formatDatabaseMemory(Number.NaN)).toBe('--')
    })

    it('returns "--" for Infinity', () => {
      expect(formatDatabaseMemory(Number.POSITIVE_INFINITY)).toBe('--')
    })

    it('returns "--" for non-numeric string', () => {
      expect(formatDatabaseMemory('abc')).toBe('--')
    })

    it('formats large values with no decimal for >= 100', () => {
      const result = formatDatabaseMemory(102400) // 100 KB
      expect(result).toBe('100 KB')
    })

    it('formats small values with one decimal', () => {
      const result = formatDatabaseMemory(1536) // 1.5 KB
      expect(result).toBe('1.5 KB')
    })
  })
})
