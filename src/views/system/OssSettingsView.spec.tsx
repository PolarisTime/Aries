import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OssOperationResult, OssSetting } from '@/api/system-settings'

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockSetQueryData = vi.fn()
const mockCan = vi.fn()
const mockShowError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockSaveMutate = vi.fn()
const mockTestStorageMutate = vi.fn()
const mockConfigureCorsMutate = vi.fn()

interface MutationOptions {
  mutationFn: { name?: string }
  onSuccess?: (value: unknown) => void
  onError?: (error: unknown) => void
}

const mutationOptionsByName = new Map<string, MutationOptions>()
const mutationPendingByName = new Map<string, boolean>()
const mutationMutatesByName = new Map([
  ['saveOssSetting', mockSaveMutate],
  ['testOssStorage', mockTestStorageMutate],
  ['configureOssCors', mockConfigureCorsMutate],
])

const defaultOssSetting: OssSetting = {
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
}

function createOssSetting(overrides: Partial<OssSetting> = {}): OssSetting {
  return {
    ...defaultOssSetting,
    ...overrides,
  }
}

function createOperationResult(
  overrides: Partial<OssOperationResult> = {},
): OssOperationResult {
  return {
    success: true,
    stage: 'probe',
    message: 'OSS ready',
    objectKey: 'attachments/probe.txt',
    details: [],
    ...overrides,
  }
}

function getMutationOptions(mutationName: string): MutationOptions {
  const options = mutationOptionsByName.get(mutationName)
  if (!options) {
    throw new Error(`Missing mutation options: ${mutationName}`)
  }
  return options
}

function mockOssSettingQuery(
  data: OssSetting | undefined,
  isFetching = false,
): void {
  mockUseQuery.mockReturnValue({
    data,
    isFetching,
  })
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(),
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
    mutationOptionsByName.clear()
    mutationPendingByName.clear()
    mockCan.mockReturnValue(true)
    mockOssSettingQuery(createOssSetting())
    mockUseMutation.mockImplementation((options: MutationOptions) => {
      const mutationName = options.mutationFn.name ?? 'unknown'
      mutationOptionsByName.set(mutationName, options)
      return {
        mutate: mutationMutatesByName.get(mutationName) ?? vi.fn(),
        isPending: mutationPendingByName.get(mutationName) ?? false,
      }
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
      expect(mockSaveMutate).toHaveBeenCalledWith(
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
    expect(
      screen.getByPlaceholderText(
        'system.ossSettings.secretKeyConfiguredPlaceholder',
      ),
    ).toBeInTheDocument()
  })

  it('disables save when user lacks update permission', () => {
    mockCan.mockReturnValue(false)

    render(<OssSettingsView />)

    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled()
  })

  it('renders required secret hint when no saved setting exists', () => {
    mockOssSettingQuery(undefined)

    render(<OssSettingsView />)

    expect(
      screen.getByText('system.ossSettings.secretKeyRequiredHint'),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('system.ossSettings.secretKeyPlaceholder'),
    ).toBeInTheDocument()
  })

  it('disables form while query is fetching or save is pending', () => {
    mockOssSettingQuery(createOssSetting(), true)
    const { rerender } = render(<OssSettingsView />)

    expect(screen.getByLabelText('system.ossSettings.bucket')).toBeDisabled()

    mockOssSettingQuery(createOssSetting())
    mutationPendingByName.set('saveOssSetting', true)
    rerender(<OssSettingsView />)

    expect(screen.getByText('common.save').closest('button')).toHaveClass(
      'ant-btn-loading',
    )
  })

  it('hides s3 credential fields in local storage mode', async () => {
    mockOssSettingQuery(
      createOssSetting({
        storageMode: 'server-local',
        endpoint: '',
        bucket: '',
        region: '',
        accessKey: '',
        secretKeyConfigured: false,
      }),
    )

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
    mockOssSettingQuery(
      createOssSetting({
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
      }),
    )

    render(<OssSettingsView />)

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => {
      expect(mockSaveMutate).toHaveBeenCalledWith(
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

  it('trims secret key when saving s3 settings', async () => {
    render(<OssSettingsView />)

    fireEvent.change(screen.getByLabelText('system.ossSettings.secretKey'), {
      target: { value: '  new-secret  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => {
      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          secretKey: 'new-secret',
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
      expect(mockTestStorageMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          storageMode: 'server-s3',
          endpoint: 'https://cos.example.com',
          bucket: 'bucket',
        }),
      )
    })
  })

  it('calls configure cors mutation with current origin and methods', async () => {
    render(<OssSettingsView />)

    fireEvent.click(
      screen.getByRole('button', { name: 'system.ossSettings.configureCors' }),
    )

    await waitFor(() => {
      expect(mockConfigureCorsMutate).toHaveBeenCalledWith({
        setting: expect.objectContaining({
          storageMode: 'server-s3',
          endpoint: 'https://cos.example.com',
          bucket: 'bucket',
        }),
        origin: window.location.origin,
        methods: ['GET', 'PUT', 'HEAD'],
      })
    })
  })

  it('uses empty origin when window origin is unavailable', async () => {
    render(<OssSettingsView />)

    const configureCorsButton = screen.getByRole('button', {
      name: 'system.ossSettings.configureCors',
    })
    const originalWindow = globalThis.window

    vi.stubGlobal('window', undefined)
    try {
      configureCorsButton.click()
    } finally {
      vi.stubGlobal('window', originalWindow)
    }

    await waitFor(() => {
      expect(mockConfigureCorsMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: '',
        }),
      )
    })
  })

  it('handles save mutation success and error', () => {
    render(<OssSettingsView />)

    const saved = createOssSetting({
      bucket: 'saved-bucket',
      secretKeyConfigured: false,
    })
    const saveOptions = getMutationOptions('saveOssSetting')

    act(() => {
      saveOptions.onSuccess?.(saved)
    })

    expect(mockMessageSuccess).toHaveBeenCalledWith('common.saveSuccess')
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['system', 'oss-setting'],
      saved,
    )

    const error = new Error('save failed')
    saveOptions.onError?.(error)

    expect(mockShowError).toHaveBeenCalledWith(
      error,
      'system.ossSettings.saveFailed',
    )
  })

  it('renders storage test result and clears it on error', async () => {
    render(<OssSettingsView />)

    const testOptions = getMutationOptions('testOssStorage')

    await act(async () => {
      testOptions.onSuccess?.(
        createOperationResult({
          message: '',
        }),
      )
    })

    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'system.ossSettings.testSuccess',
    )

    await act(async () => {
      testOptions.onSuccess?.(
        createOperationResult({
          message: 'Storage test passed',
          details: ['bucket reachable', 'probe object removed'],
        }),
      )
    })

    expect(screen.getByText('Storage test passed')).toBeInTheDocument()
    expect(screen.getByText('bucket reachable')).toBeInTheDocument()
    expect(screen.getByText('probe object removed')).toBeInTheDocument()
    expect(mockMessageSuccess).toHaveBeenLastCalledWith('Storage test passed')

    const error = new Error('storage failed')
    await act(async () => {
      testOptions.onError?.(error)
    })

    expect(screen.queryByText('Storage test passed')).not.toBeInTheDocument()
    expect(mockShowError).toHaveBeenCalledWith(
      error,
      'system.ossSettings.testFailed',
    )
  })

  it('handles cors mutation result and error', async () => {
    render(<OssSettingsView />)

    const corsOptions = getMutationOptions('configureOssCors')

    await act(async () => {
      corsOptions.onSuccess?.(
        createOperationResult({
          success: false,
          message: '',
        }),
      )
    })

    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'system.ossSettings.corsSuccess',
    )
    expect(document.querySelector('.oss-settings-result')).toHaveClass(
      'ant-alert-error',
    )

    await act(async () => {
      corsOptions.onSuccess?.(
        createOperationResult({
          success: true,
          message: 'CORS configured',
        }),
      )
    })

    expect(screen.getByText('CORS configured')).toBeInTheDocument()
    expect(mockMessageSuccess).toHaveBeenLastCalledWith('CORS configured')

    const error = new Error('cors failed')
    await act(async () => {
      corsOptions.onError?.(error)
    })

    expect(screen.queryByText('CORS configured')).not.toBeInTheDocument()
    expect(mockShowError).toHaveBeenCalledWith(
      error,
      'system.ossSettings.corsFailed',
    )
  })
})
