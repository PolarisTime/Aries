import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSetFieldValue = vi.fn()
const mockGetFieldValue = vi.fn()
const mockUseWatch = vi.hoisted(() => vi.fn(() => []))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('antd', () => ({
  Form: {
    useWatch: mockUseWatch,
  },
}))

vi.mock('@/views/system/user-account-view-utils', () => ({
  buildSelectedRoleDataScope: vi.fn(
    (ids: string[], _options: unknown[], current?: string) => {
      if (ids.length === 0) return '本人'
      return current || '全部数据'
    },
  ),
  buildSelectedRoleSummaries: vi.fn(
    (
      ids: string[],
      options: Array<{ id: string; permissionSummary?: string }>,
    ) => {
      return options
        .filter((o) => ids.includes(String(o.id)))
        .map((o) => o.permissionSummary || '')
        .filter(Boolean)
    },
  ),
}))

import { useUserAccountEditorRoleState } from '@/views/system/useUserAccountEditorRoleState'

function createMockForm(values: Record<string, unknown> = {}) {
  return {
    setFieldValue: mockSetFieldValue,
    getFieldValue: mockGetFieldValue.mockImplementation(
      (key: string) => values[key],
    ),
  } as never
}

describe('useUserAccountEditorRoleState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWatch.mockReturnValue([])
  })

  it('returns initial state with empty selections', () => {
    const form = createMockForm()
    const { result } = renderHook(() =>
      useUserAccountEditorRoleState({ form, roleOptions: [] }),
    )
    expect(result.current.selectedRoleIds).toEqual([])
    expect(result.current.selectedRoleSummaries).toEqual([])
  })

  it('returns functions and values', () => {
    const form = createMockForm()
    const { result } = renderHook(() =>
      useUserAccountEditorRoleState({ form, roleOptions: [] }),
    )
    expect(result.current).toHaveProperty('selectedRoleDataScope')
    expect(result.current).toHaveProperty('selectedRoleIds')
    expect(result.current).toHaveProperty('selectedRoleSummaries')
  })

  it('handles empty roleOptions', () => {
    const form = createMockForm()
    const { result } = renderHook(() =>
      useUserAccountEditorRoleState({ form, roleOptions: [] }),
    )
    expect(result.current.selectedRoleDataScope).toBeDefined()
    expect(Array.isArray(result.current.selectedRoleSummaries)).toBe(true)
  })

  it('maps watched role ids to strings', () => {
    mockUseWatch.mockReturnValue([1, '2'])
    const form = createMockForm({ dataScope: '全部数据' })
    const { result } = renderHook(() =>
      useUserAccountEditorRoleState({
        form,
        roleOptions: [
          {
            id: '1',
            roleName: '管理员',
            roleCode: 'admin',
            permissionSummary: '管理权限',
          },
          {
            id: '2',
            roleName: '财务',
            roleCode: 'finance',
            permissionSummary: '财务权限',
          },
        ],
      }),
    )

    expect(result.current.selectedRoleIds).toEqual(['1', '2'])
    expect(result.current.selectedRoleSummaries).toEqual([
      '管理权限',
      '财务权限',
    ])
  })

  it('treats non-array watched role value as empty selection', () => {
    mockUseWatch.mockReturnValue('1')
    const form = createMockForm()
    const { result } = renderHook(() =>
      useUserAccountEditorRoleState({ form, roleOptions: [] }),
    )

    expect(result.current.selectedRoleIds).toEqual([])
  })
})
