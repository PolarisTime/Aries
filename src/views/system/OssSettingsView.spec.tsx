import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockSetQueryData = vi.fn()
const mockCan = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockMutate = vi.fn()

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
      mutate: mockMutate,
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
    expect(
      screen.getByRole('button', { name: 'system.ossSettings.testStorage' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'system.ossSettings.configureCors' }),
    ).toBeInTheDocument()
  })

  it('renders major s3 provider presets', async () => {
    render(<OssSettingsView />)

    fireEvent.mouseDown(screen.getByLabelText('system.ossSettings.provider'))

    await waitFor(() => {
      expect(
        screen.getByText('system.ossSettings.providerCloudflareR2'),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText('system.ossSettings.providerBackblazeB2'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.ossSettings.providerDigitalOceanSpaces'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.ossSettings.providerMinio'),
    ).toBeInTheDocument()
  })

  it('applies provider preset defaults when changing provider', async () => {
    render(<OssSettingsView />)

    fireEvent.mouseDown(screen.getByLabelText('system.ossSettings.provider'))
    fireEvent.click(await screen.findByText('system.ossSettings.providerMinio'))
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'minio',
          endpoint: 'http://127.0.0.1:9000',
          region: 'us-east-1',
          pathStyleAccess: true,
          bucket: 'bucket',
          accessKey: 'ak',
        }),
      )
    })
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

  it('hides s3 credential fields in local storage mode', async () => {
    mockUseQuery.mockReturnValue({
      data: {
        storageMode: 'server-local',
        provider: 's3-compatible',
        endpoint: '',
        bucket: '',
        region: '',
        accessKey: '',
        secretKeyConfigured: false,
        keyPrefix: 'attachments',
        pathStyleAccess: true,
        encryptedStorage: false,
        serverProxyOnly: true,
      },
      isFetching: false,
    })

    render(<OssSettingsView />)

    await waitFor(() => {
      expect(
        screen.queryByText('system.ossSettings.endpoint'),
      ).not.toBeInTheDocument()
    })
    expect(
      screen.queryByText('system.ossSettings.provider'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.ossSettings.bucket'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.ossSettings.region'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.ossSettings.accessKey'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('system.ossSettings.secretKey'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('system.ossSettings.localModeHint'),
    ).toBeInTheDocument()
  })

  it('clears s3 values when saving local storage mode', async () => {
    mockUseQuery.mockReturnValue({
      data: {
        storageMode: 'server-local',
        provider: 'tencent-cos',
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

    render(<OssSettingsView />)

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          storageMode: 'server-local',
          provider: 's3-compatible',
          endpoint: '',
          bucket: '',
          region: '',
          accessKey: '',
          secretKey: undefined,
        }),
      )
    })
  })

  it('calls storage test mutation with current form payload', async () => {
    render(<OssSettingsView />)

    fireEvent.click(
      screen.getByRole('button', { name: 'system.ossSettings.testStorage' }),
    )

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          storageMode: 'server-s3',
          endpoint: 'https://cos.example.com',
          bucket: 'bucket',
        }),
      )
    })
  })
})
