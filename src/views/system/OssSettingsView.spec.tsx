import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockSetQueryData = vi.fn()
const mockCan = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => ({
    setQueryData: mockSetQueryData,
  }),
}))

vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: () => ({ can: mockCan }),
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: mockShowError }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: (...args: unknown[]) => mockMessageSuccess(...args),
  },
}))

import { OssSettingsView } from '@/views/system/OssSettingsView'

describe('OssSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockUseQuery.mockReturnValue({
      data: {
        storageMode: 'server-s3',
        provider: 's3-compatible',
        endpoint: 'https://cos.example.com',
        bucket: 'bucket',
        region: 'ap-guangzhou',
        accessKey: 'ak',
        secretKeyConfigured: true,
        keyPrefix: 'attachments',
        pathStyleAccess: true,
        encryptedStorage: false,
        serverProxyOnly: true,
      },
      isFetching: false,
    })
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
  })

  it('renders oss settings form fields', () => {
    render(<OssSettingsView />)

    expect(screen.getByText('system.ossSettings.title')).toBeInTheDocument()
    expect(
      screen.getByText('system.ossSettings.pendingApi'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.ossSettings.storageMode'),
    ).toBeInTheDocument()
    expect(screen.getByText('system.ossSettings.provider')).toBeInTheDocument()
    expect(screen.getByText('system.ossSettings.endpoint')).toBeInTheDocument()
    expect(screen.getByText('system.ossSettings.bucket')).toBeInTheDocument()
    expect(screen.getByText('system.ossSettings.region')).toBeInTheDocument()
    expect(screen.getByText('system.ossSettings.accessKey')).toBeInTheDocument()
    expect(screen.getByText('system.ossSettings.secretKey')).toBeInTheDocument()
    expect(screen.getByText('system.ossSettings.keyPrefix')).toBeInTheDocument()
    expect(
      screen.getByText('system.ossSettings.pathStyleAccess'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.ossSettings.encryptedStorage'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.ossSettings.serverProxyOnly'),
    ).toBeInTheDocument()
  })

  it('enables save when user has update permission', () => {
    render(<OssSettingsView />)

    expect(screen.getByRole('button', { name: 'common.save' })).toBeEnabled()
    expect(
      screen.getByText('system.ossSettings.secretKeyKeepHint'),
    ).toBeInTheDocument()
  })

  it('disables save when user lacks update permission', () => {
    mockCan.mockReturnValue(false)

    render(<OssSettingsView />)

    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled()
  })
})
