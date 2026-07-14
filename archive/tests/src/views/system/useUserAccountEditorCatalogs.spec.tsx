import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListRoleOptions = vi.fn()
const mockListDepartmentOptions = vi.fn()
const mockUseQuery = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock('@/api/user-accounts', () => ({
  listRoleOptions: (...args: unknown[]) => mockListRoleOptions(...args),
  listDepartmentOptions: (...args: unknown[]) =>
    mockListDepartmentOptions(...args),
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    roleOptions: ['roleOptions'],
    departmentOptions: ['departmentOptions'],
  },
}))

import { useUserAccountEditorCatalogs } from '@/views/system/useUserAccountEditorCatalogs'

describe('useUserAccountEditorCatalogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: [] })
  })

  it('returns empty arrays initially', () => {
    const { result } = renderHook(() =>
      useUserAccountEditorCatalogs({
        canViewRoleCatalog: false,
        canViewDepartmentCatalog: false,
      }),
    )
    expect(result.current.roleOptions).toEqual([])
    expect(result.current.departmentOptions).toEqual([])
  })

  it('fetches role options when canViewRoleCatalog is true', () => {
    const roles = [{ id: '1', roleName: 'Admin' }]
    mockUseQuery.mockReturnValue({ data: roles })
    const { result } = renderHook(() =>
      useUserAccountEditorCatalogs({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: false,
      }),
    )
    expect(result.current.roleOptions).toEqual(roles)
  })

  it('fetches department options when canViewDepartmentCatalog is true', () => {
    const departments = [{ id: '10', deptName: 'Engineering' }]
    mockUseQuery.mockReturnValue({ data: departments })
    const { result } = renderHook(() =>
      useUserAccountEditorCatalogs({
        canViewRoleCatalog: false,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current.departmentOptions).toEqual(departments)
  })

  it('passes enabled prop correctly for role options', () => {
    renderHook(() =>
      useUserAccountEditorCatalogs({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: false,
        enabled: false,
      }),
    )
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('returns both options when both permissions are true', () => {
    const roles = [{ id: '1', roleName: 'Admin' }]
    const departments = [{ id: '10', deptName: 'Engineering' }]
    mockUseQuery
      .mockReturnValueOnce({ data: roles })
      .mockReturnValueOnce({ data: departments })
    const { result } = renderHook(() =>
      useUserAccountEditorCatalogs({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current.roleOptions).toEqual(roles)
    expect(result.current.departmentOptions).toEqual(departments)
  })

  it('returns empty array when data is undefined', () => {
    mockUseQuery.mockReturnValue({ data: undefined })
    const { result } = renderHook(() =>
      useUserAccountEditorCatalogs({
        canViewRoleCatalog: true,
        canViewDepartmentCatalog: true,
      }),
    )
    expect(result.current.roleOptions).toEqual([])
    expect(result.current.departmentOptions).toEqual([])
  })
})
