import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSetFieldValue = vi.fn()
const mockGetFieldValue = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

vi.mock('antd/es/form', () => ({
  default: {
    useWatch: vi.fn(() => []),
  },
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
})
