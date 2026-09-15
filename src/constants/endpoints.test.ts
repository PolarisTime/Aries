import { describe, expect, it } from 'vitest'
import { ENDPOINTS } from './endpoints'

describe('print endpoint contracts', () => {
  it('exposes resource endpoints for print export and preview items', () => {
    expect(ENDPOINTS.PRINT_EXPORTS).toBe('/print-exports')
    expect(ENDPOINTS.PRINT_PREVIEWS_ITEMS).toBe('/print-previews/items')
  })
})

describe('role endpoint contracts (RBAC0)', () => {
  it('exposes role, permission and user-role resource paths', () => {
    expect(ENDPOINTS.ROLES).toBe('/roles')
    expect(ENDPOINTS.ROLE('42')).toBe('/roles/42')
    expect(ENDPOINTS.ROLE_STATUS('42')).toBe('/roles/42/status')
    expect(ENDPOINTS.ROLE_PERMISSIONS('42')).toBe('/roles/42/permissions')
    expect(ENDPOINTS.PERMISSIONS).toBe('/permissions')
    expect(ENDPOINTS.USER_ROLES('42')).toBe('/users/42/roles')
  })

  it('encodes id path segments', () => {
    expect(ENDPOINTS.ROLE('a/b')).toBe('/roles/a%2Fb')
  })
})
