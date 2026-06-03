import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/api/security-keys', () => ({
  getSecurityKeyOverview: vi.fn(),
  rotateJwtSecurityKey: vi.fn(),
  rotateTotpSecurityKey: vi.fn(),
}))

vi.mock('@/components/TwoFactorConfirmModal', () => ({
  TwoFactorConfirmModal: () => <div data-testid="totp-confirm">Confirm</div>,
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/utils/formatters', () => ({
  formatDateTime: (v: unknown, fallback: string) => (v ? String(v) : fallback),
}))

import { SecurityKeyManagementView } from '@/views/system/SecurityKeyManagementView'

describe('SecurityKeyManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({
      data: {
        data: {
          jwt: {
            keyName: 'JWT Key',
            keyCode: 'jwt-key',
            source: 'DATABASE',
            activeVersion: 1,
            activeFingerprint: 'abc123',
            activatedAt: '2024-01-01',
            retiredVersionCount: 0,
            protectedRecordCount: 100,
            remark: 'JWT signing key',
          },
          totp: {
            keyName: 'TOTP Key',
            keyCode: 'totp-key',
            source: 'DATABASE',
            activeVersion: 1,
            activeFingerprint: 'def456',
            activatedAt: '2024-01-01',
            retiredVersionCount: 0,
            protectedRecordCount: 50,
            remark: 'TOTP key',
          },
        },
      },
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    })
  })

  it('renders without crashing', () => {
    expect(SecurityKeyManagementView).toBeDefined()
    expect(typeof SecurityKeyManagementView).toBe('function')
  })

  it('renders the page title', () => {
    render(<SecurityKeyManagementView />)
    expect(screen.getByText('system.securityKey.title')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<SecurityKeyManagementView />)
    expect(
      screen.getByText('system.securityKey.description'),
    ).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    render(<SecurityKeyManagementView />)
    expect(screen.getByText('system.securityKey.refresh')).toBeInTheDocument()
  })

  it('renders security warning alert', () => {
    render(<SecurityKeyManagementView />)
    expect(screen.getByText('system.securityKey.riskTitle')).toBeInTheDocument()
  })

  it('renders key cards', () => {
    render(<SecurityKeyManagementView />)
    expect(screen.getByText('JWT Key')).toBeInTheDocument()
    expect(screen.getByText('TOTP Key')).toBeInTheDocument()
  })

  it('renders configured keys statistic', () => {
    render(<SecurityKeyManagementView />)
    expect(
      screen.getByText('system.securityKey.configuredKeys'),
    ).toBeInTheDocument()
  })

  it('renders protected records statistic', () => {
    render(<SecurityKeyManagementView />)
    expect(
      screen.getByText('system.securityKey.protectedRecords'),
    ).toBeInTheDocument()
  })

  it('renders retired versions statistic', () => {
    render(<SecurityKeyManagementView />)
    expect(
      screen.getByText('system.securityKey.retiredVersions'),
    ).toBeInTheDocument()
  })

  it('renders rotate buttons', () => {
    render(<SecurityKeyManagementView />)
    expect(screen.getByText('system.securityKey.rotateJwt')).toBeInTheDocument()
    expect(
      screen.getByText('system.securityKey.rotateTotp'),
    ).toBeInTheDocument()
  })

  it('shows skeleton when loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      isLoading: true,
      refetch: vi.fn(),
    })
    const { container } = render(<SecurityKeyManagementView />)
    expect(
      container.querySelector('.ant-skeleton, .ant-card-loading'),
    ).toBeInTheDocument()
  })
})
