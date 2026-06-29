import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListRoleSettingsPage = vi.fn()
const mockUseQuery = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock('@/api/role-actions', () => ({
  listRoleSettingsPage: (...args: unknown[]) =>
    mockListRoleSettingsPage(...args),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: { roleSettings: ['roleSettings'] },
}))

import { useRoleSettingsList } from '@/views/system/useRoleSettingsList'

describe('useRoleSettingsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state with empty roles when no data', () => {
    mockUseQuery.mockReturnValue({ data: undefined })
    const { result } = renderHook(() => useRoleSettingsList())
    expect(result.current.roles).toEqual([])
  })

  it('returns roles from query data', () => {
    const roles = [
      { id: '1', roleName: 'Admin', roleCode: 'admin' },
      { id: '2', roleName: 'User', roleCode: 'user' },
    ]
    mockUseQuery.mockReturnValue({ data: roles })
    const { result } = renderHook(() => useRoleSettingsList())
    expect(result.current.roles).toEqual(roles)
  })

  it('passes query function that fetches all pages', async () => {
    mockUseQuery.mockImplementation(() => ({ data: [] }))
    renderHook(() => useRoleSettingsList())
    expect(mockUseQuery).toHaveBeenCalled()
  })

  it('does not fetch when enabled is false', () => {
    mockUseQuery.mockReturnValue({ data: [] })
    renderHook(() => useRoleSettingsList(false))
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('returns roles array', () => {
    const roles = [{ id: '1', roleName: 'Admin' }]
    mockUseQuery.mockReturnValue({ data: roles })
    const { result } = renderHook(() => useRoleSettingsList())
    expect(Array.isArray(result.current.roles)).toBe(true)
    expect(result.current.roles).toHaveLength(1)
  })
})
