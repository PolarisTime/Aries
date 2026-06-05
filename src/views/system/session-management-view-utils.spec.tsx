import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { RefreshTokenRecord } from '@/api/session-management'
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

    it('renders revoke action for editable valid sessions', () => {
      const onRevoke = vi.fn()
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke,
        t: mockT,
      })
      const actionCol = columns.find(
        (col) => 'key' in col && col.key === 'action',
      )
      const record = sessionRecord({ status: 'valid' })

      render(<div>{actionCol?.render?.(null, record, 0)}</div>)
      fireEvent.click(screen.getByRole('button', { name: /disable/i }))

      expect(onRevoke).toHaveBeenCalledWith(record)
    })

    it('hides revoke action for readonly or disabled sessions', () => {
      const readonlyColumns = buildSessionTableColumns({
        canEdit: false,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      const editableColumns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      const readonlyAction = readonlyColumns.find(
        (col) => 'key' in col && col.key === 'action',
      )
      const editableAction = editableColumns.find(
        (col) => 'key' in col && col.key === 'action',
      )

      expect(
        readonlyAction?.render?.(null, sessionRecord({ status: 'valid' }), 0),
      ).toBeNull()
      expect(
        editableAction?.render?.(
          null,
          sessionRecord({ status: 'disabled' }),
          0,
        ),
      ).toBeNull()
    })

    it('renders status and online labels for known and unknown states', () => {
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      const onlineCol = columns.find(
        (col) => 'key' in col && col.key === 'online',
      )
      const statusCol = columns.find(
        (col) => 'dataIndex' in col && col.dataIndex === 'status',
      )

      const { rerender } = render(
        <>
          {onlineCol?.render?.(
            null,
            sessionRecord({ status: '有效', online: true }),
            0,
          )}
          {statusCol?.render?.('有效', sessionRecord({ status: '有效' }), 0)}
        </>,
      )
      expect(screen.getByText('system.session.online')).toBeInTheDocument()
      expect(screen.getByText('system.session.valid')).toBeInTheDocument()

      rerender(
        <>
          {onlineCol?.render?.(
            null,
            sessionRecord({ status: 'revoked', online: true }),
            0,
          )}
          {statusCol?.render?.(
            'mystery',
            sessionRecord({ status: 'mystery' }),
            0,
          )}
        </>,
      )
      expect(screen.getByText('system.session.offline')).toBeInTheDocument()
      expect(screen.getByText('mystery')).toBeInTheDocument()
    })

    it('renders truncated device info and date fallback', () => {
      const columns = buildSessionTableColumns({
        canEdit: true,
        onRevoke: mockOnRevoke,
        t: mockT,
      })
      const deviceCol = columns.find(
        (col) => 'dataIndex' in col && col.dataIndex === 'deviceInfo',
      )
      const createdCol = columns.find(
        (col) => 'dataIndex' in col && col.dataIndex === 'createdAt',
      )

      expect(
        String(deviceCol?.render?.('x'.repeat(70), sessionRecord(), 0)),
      ).toHaveLength(63)
      expect(deviceCol?.render?.('', sessionRecord(), 0)).toBe('--')
      expect(createdCol?.render?.('', sessionRecord(), 0)).toBe('--')
    })
  })
})

function sessionRecord(
  overrides: Partial<RefreshTokenRecord> = {},
): RefreshTokenRecord {
  return {
    id: '1',
    userId: 'u1',
    loginName: 'tester',
    userName: '测试员',
    tokenId: 'token-1',
    loginIp: '127.0.0.1',
    deviceInfo: 'Chrome',
    createdAt: '2026-06-01 10:00:00',
    expiresAt: '2026-07-01 10:00:00',
    revokedAt: null,
    status: 'valid',
    lastActiveAt: null,
    online: false,
    ...overrides,
  }
}
