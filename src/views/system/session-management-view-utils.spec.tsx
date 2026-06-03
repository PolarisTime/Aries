import { describe, expect, it, vi } from 'vitest'

import { buildSessionTableColumns } from '@/views/system/session-management-view-utils'

describe('session-management-view-utils', () => {
  describe('buildSessionTableColumns', () => {
    const mockT = vi.fn((key: string) => key)
    const mockOnRevoke = vi.fn()

    it('exports buildSessionTableColumns as a function', () => {
      expect(typeof buildSessionTableColumns).toBe('function')
    })

    it('returns an array of column definitions', () => {
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      expect(Array.isArray(columns)).toBe(true)
      expect(columns.length).toBeGreaterThan(0)
    })

    it('includes expected column data indexes', () => {
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      const dataIndexes = columns
        .map((col) => ('dataIndex' in col ? col.dataIndex : undefined))
        .filter(Boolean)
      expect(dataIndexes).toContain('tokenId')
      expect(dataIndexes).toContain('loginName')
      expect(dataIndexes).toContain('userName')
      expect(dataIndexes).toContain('loginIp')
      expect(dataIndexes).toContain('deviceInfo')
      expect(dataIndexes).toContain('createdAt')
      expect(dataIndexes).toContain('lastActiveAt')
      expect(dataIndexes).toContain('expiresAt')
      expect(dataIndexes).toContain('status')
    })

    it('includes action column', () => {
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      const actionCol = columns.find(
        (col) => 'key' in col && col.key === 'action',
      )
      expect(actionCol).toBeDefined()
    })

    it('includes online column', () => {
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      const onlineCol = columns.find(
        (col) => 'key' in col && col.key === 'online',
      )
      expect(onlineCol).toBeDefined()
    })

    it('each column has a title', () => {
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      for (const col of columns) {
        expect(col).toHaveProperty('title')
      }
    })

    it('each column has a width', () => {
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      for (const col of columns) {
        expect(col).toHaveProperty('width')
      }
    })
  })
})
