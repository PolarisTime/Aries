import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const loggerWarnMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  http: {
    get: httpGetMock,
  },
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: loggerWarnMock,
  },
}))

import { normalizeAction, resolveResourceKey, loadPermissionCatalog } from './resource-permissions'

describe('resource-permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeAction', () => {
    it('normalizes common action aliases', () => {
      expect(normalizeAction('VIEW')).toBe('read')
      expect(normalizeAction('CREATE')).toBe('create')
      expect(normalizeAction('EDIT')).toBe('update')
      expect(normalizeAction('DELETE')).toBe('delete')
      expect(normalizeAction('AUDIT')).toBe('audit')
      expect(normalizeAction('EXPORT')).toBe('export')
      expect(normalizeAction('PRINT')).toBe('print')
    })

    it('normalizes lowercase aliases', () => {
      expect(normalizeAction('view')).toBe('read')
      expect(normalizeAction('create')).toBe('create')
      expect(normalizeAction('edit')).toBe('update')
    })

    it('returns original value when no alias match', () => {
      expect(normalizeAction('approve')).toBe('approve')
      expect(normalizeAction('CUSTOM_ACTION')).toBe('custom_action')
    })

    it('handles null/undefined by returning empty string', () => {
      expect(normalizeAction(null)).toBe('')
      expect(normalizeAction(undefined)).toBe('')
    })

    it('trims and lowercases the input', () => {
      expect(normalizeAction('  VIEW  ')).toBe('read')
    })
  })

  describe('resolveResourceKey', () => {
    it('falls back to normalized key when not in map', () => {
      expect(resolveResourceKey('custom-module')).toBe('custom-module')
    })

    it('uses fallback map for material-categories', () => {
      expect(resolveResourceKey('material-categories')).toBe('material')
    })

    it('handles null/undefined', () => {
      expect(resolveResourceKey(null)).toBe('')
      expect(resolveResourceKey(undefined)).toBe('')
    })

    it('trims and lowercases', () => {
      expect(resolveResourceKey('  MATERIAL-CATEGORIES  ')).toBe('material')
    })
  })

  describe('loadPermissionCatalog', () => {
    it('handles network error', async () => {
      httpGetMock.mockRejectedValue(new Error('Network error'))
      await loadPermissionCatalog()
      expect(loggerWarnMock).toHaveBeenCalledWith(
        '[resource-permissions] failed to load catalog, using fallback maps:',
        expect.any(Error),
      )
    })

    it('handles invalid response (non-array data)', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: 'not-an-array',
      })
      await loadPermissionCatalog()
      expect(loggerWarnMock).toHaveBeenCalledWith(
        '[resource-permissions] catalog response invalid, using fallback maps',
      )
    })

    it('handles invalid response code', async () => {
      httpGetMock.mockResolvedValue({
        code: -1,
        data: [],
      })
      await loadPermissionCatalog()
      expect(loggerWarnMock).toHaveBeenCalledWith(
        '[resource-permissions] catalog response invalid, using fallback maps',
      )
    })

    it('loads catalog and updates resolveResourceKey', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: [
          {
            code: 'purchase-order',
            title: '采购订单',
            group: 'purchase',
            businessResource: true,
            menuCodes: ['/purchase-order'],
            pathPrefixes: ['/purchase-order'],
            actions: [{ code: 'purchase-order.create', title: '创建' }],
          },
        ],
      })
      await loadPermissionCatalog()
      expect(resolveResourceKey('purchase-order')).toBe('purchase-order')
      expect(resolveResourceKey('/purchase-order')).toBe('purchase-order')
    })

    it('returns immediately when catalog is already ready', async () => {
      httpGetMock.mockClear()
      await loadPermissionCatalog()
      expect(httpGetMock).not.toHaveBeenCalled()
    })
  })
})
