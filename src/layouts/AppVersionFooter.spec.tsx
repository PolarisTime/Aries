import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFetchBackendInfo, mockUseQuery } = vi.hoisted(() => ({
  mockFetchBackendInfo: vi.fn(),
  mockUseQuery: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

vi.mock('@/api/auth', () => ({
  fetchBackendInfo: mockFetchBackendInfo,
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    backendInfo: ['backend-info'],
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      const map: Record<string, string> = {
        'common.productCopyright': '© 2026C Leo',
        'common.frontendVersion': '前端 v{{version}}',
        'common.backendVersion': '后端 v{{version}}',
        'common.versionUnknown': '--',
      }
      return (map[key] ?? key).replace('{{version}}', options?.version ?? '')
    },
  }),
}))

vi.mock('@/utils/env', () => ({
  frontendVersion: '0.2.0',
}))

import { fetchBackendInfo } from '@/api/auth'
import { AppVersionFooter } from '@/layouts/AppVersionFooter'

describe('AppVersionFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({
      data: {
        app: 'leo',
        version: '1.1.2',
        gitCommit: 'abcdef1',
        buildTime: '2026-07-05T03:30:00Z',
      },
    })
  })

  it('renders frontend version and backend version from /version', () => {
    render(<AppVersionFooter />)

    expect(screen.getByText('© 2026C Leo')).toBeTruthy()
    expect(screen.getByText('前端 v0.2.0')).toBeTruthy()
    expect(screen.getByText('后端 v1.1.2')).toBeTruthy()
  })

  it('falls back to versionUnknown when backend info is unavailable', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isError: true })

    render(<AppVersionFooter />)

    expect(screen.getByText('后端 v--')).toBeTruthy()
  })

  it('uses a stable backend info query without polling', () => {
    render(<AppVersionFooter />)

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['backend-info'],
      queryFn: fetchBackendInfo,
      staleTime: 60 * 60 * 1000,
      gcTime: 2 * 60 * 60 * 1000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
    })
  })
})
