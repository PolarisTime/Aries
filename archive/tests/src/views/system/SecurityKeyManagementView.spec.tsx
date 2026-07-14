import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const securityKeyMocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  modalConfirm: vi.fn(),
  pageVisible: true,
  queryConfig: undefined as any,
  queryResult: undefined as any,
  refetch: vi.fn(),
  rotateJwtSecurityKey: vi.fn(),
  rotateTotpSecurityKey: vi.fn(),
  useQuery: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      options?.type ? `${key}:${options.type}` : key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (config: unknown) => {
    securityKeyMocks.queryConfig = config
    return securityKeyMocks.useQuery(config)
  },
  useQueryClient: () => ({
    invalidateQueries: securityKeyMocks.invalidateQueries,
  }),
}))

vi.mock('@/api/security-keys', () => ({
  getSecurityKeyOverview: vi.fn(),
  rotateJwtSecurityKey: (...args: unknown[]) =>
    securityKeyMocks.rotateJwtSecurityKey(...args),
  rotateTotpSecurityKey: (...args: unknown[]) =>
    securityKeyMocks.rotateTotpSecurityKey(...args),
}))

vi.mock('@/components/TwoFactorConfirmModal', () => ({
  TwoFactorConfirmModal: ({ onCancel, onConfirm, open, title }: any) => (
    <section data-open={String(open)} data-testid="totp-confirm">
      <h2>{title}</h2>
      <button
        type="button"
        onClick={() => void onConfirm('123456').catch(() => undefined)}
      >
        confirm-rotation
      </button>
      <button type="button" onClick={onCancel}>
        cancel-rotation
      </button>
    </section>
  ),
}))

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => securityKeyMocks.pageVisible,
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    error: securityKeyMocks.messageError,
    success: securityKeyMocks.messageSuccess,
  },
  modal: {
    confirm: securityKeyMocks.modalConfirm,
  },
}))

vi.mock('@/utils/formatters', () => ({
  formatDateTime: (v: unknown, fallback: string) => (v ? String(v) : fallback),
}))

vi.mock('@ant-design/icons', () => ({
  KeyOutlined: () => <span data-testid="key-icon" />,
  RedoOutlined: () => <span data-testid="redo-icon" />,
  ReloadOutlined: () => <span data-testid="reload-icon" />,
  SafetyCertificateOutlined: () => <span data-testid="safety-icon" />,
}))

vi.mock('antd', () => {
  const Button = ({ children, disabled, loading, onClick }: any) => (
    <button
      data-loading={String(Boolean(loading))}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
  const Card = ({ children, extra, loading, title }: any) => (
    <section data-loading={String(Boolean(loading))}>
      {title ? <header>{title}</header> : null}
      {extra ? <div>{extra}</div> : null}
      {children}
    </section>
  )
  const Descriptions = ({ children }: any) => <dl>{children}</dl>
  Descriptions.Item = ({ children, label }: any) => (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
  const Typography = {
    Text: ({ children }: any) => <span>{children}</span>,
    Title: ({ children }: any) => <h1>{children}</h1>,
  }

  return {
    Alert: ({ description, title }: any) => (
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    ),
    Button,
    Card,
    Col: ({ children }: any) => <div>{children}</div>,
    Descriptions,
    Row: ({ children }: any) => <div>{children}</div>,
    Statistic: ({ suffix = '', title, value }: any) => (
      <span>
        {title}:{value}
        {suffix}
      </span>
    ),
    Tag: ({ children, color }: any) => (
      <span data-color={color}>{children}</span>
    ),
    Typography,
  }
})

import { SecurityKeyManagementView } from '@/views/system/SecurityKeyManagementView'

function buildOverview(overrides: Record<string, unknown> = {}) {
  return {
    jwt: {
      keyName: 'JWT Key',
      keyCode: 'jwt-key',
      source: 'DATABASE',
      activeVersion: 1,
      activeFingerprint: 'abc123',
      activatedAt: '2024-01-01',
      retiredVersionCount: 2,
      protectedRecordCount: 100,
      remark: 'JWT signing key',
    },
    totp: {
      keyName: 'TOTP Key',
      keyCode: 'totp-key',
      source: 'CONFIG',
      activeVersion: 1,
      activeFingerprint: 'def456',
      activatedAt: '2024-01-02',
      retiredVersionCount: 3,
      protectedRecordCount: 50,
      remark: 'TOTP key',
    },
    ...overrides,
  }
}

describe('SecurityKeyManagementView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    securityKeyMocks.pageVisible = true
    securityKeyMocks.refetch = vi.fn()
    securityKeyMocks.queryResult = {
      data: {
        data: buildOverview(),
      },
      isFetching: false,
      isLoading: false,
      refetch: securityKeyMocks.refetch,
    }
    securityKeyMocks.useQuery.mockImplementation(
      () => securityKeyMocks.queryResult,
    )
    securityKeyMocks.rotateJwtSecurityKey.mockResolvedValue(undefined)
    securityKeyMocks.rotateTotpSecurityKey.mockResolvedValue(undefined)
  })

  it('renders key overview and enables query when page is active and visible', () => {
    render(<SecurityKeyManagementView />)

    expect(securityKeyMocks.queryConfig).toEqual(
      expect.objectContaining({ enabled: true, queryKey: ['security-key'] }),
    )
    expect(screen.getByText('system.securityKey.title')).toBeInTheDocument()
    expect(
      screen.getByText('system.securityKey.description'),
    ).toBeInTheDocument()
    expect(screen.getByText('system.securityKey.riskTitle')).toBeInTheDocument()
    expect(screen.getByText('JWT Key')).toBeInTheDocument()
    expect(screen.getByText('TOTP Key')).toBeInTheDocument()
    expect(
      screen.getByText('system.securityKey.configuredKeys:2/ 2'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.securityKey.protectedRecords:150'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.securityKey.retiredVersions:5'),
    ).toBeInTheDocument()
    expect(screen.getByText('DATABASE')).toHaveAttribute('data-color', 'green')
    expect(screen.getByText('CONFIG')).toHaveAttribute('data-color', 'blue')
  })

  it('disables the query when inactive or hidden', () => {
    render(<SecurityKeyManagementView active={false} />)
    expect(securityKeyMocks.queryConfig).toEqual(
      expect.objectContaining({ enabled: false }),
    )

    securityKeyMocks.pageVisible = false
    render(<SecurityKeyManagementView />)
    expect(securityKeyMocks.queryConfig).toEqual(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('renders fallback values, unknown source colors, and loading state', () => {
    securityKeyMocks.queryResult = {
      data: {
        data: buildOverview({
          jwt: {
            keyName: '',
            keyCode: '',
            source: 'FILE',
            activeVersion: Number.NaN,
            activeFingerprint: '',
            activatedAt: undefined,
            retiredVersionCount: undefined,
            protectedRecordCount: undefined,
            remark: '',
          },
          totp: undefined,
        }),
      },
      isFetching: true,
      isLoading: true,
      refetch: securityKeyMocks.refetch,
    }

    render(<SecurityKeyManagementView />)

    expect(screen.getByText('FILE')).toHaveAttribute('data-color', 'default')
    expect(screen.getByText('system.securityKey.unknown')).toHaveAttribute(
      'data-color',
      'default',
    )
    expect(
      screen.getByText('system.securityKey.configuredKeys:1/ 2'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.securityKey.protectedRecords:0'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.securityKey.retiredVersions:0'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('--').length).toBeGreaterThan(0)
    expect(screen.getByText('system.securityKey.refresh')).toHaveAttribute(
      'data-loading',
      'true',
    )
    expect(screen.getByText('system.securityKey.rotateTotp')).toBeDisabled()
  })

  it('refreshes the security key overview', () => {
    render(<SecurityKeyManagementView />)

    fireEvent.click(screen.getByText('system.securityKey.refresh'))

    expect(securityKeyMocks.refetch).toHaveBeenCalled()
  })

  it('rotates the JWT key after two-factor confirmation', async () => {
    render(<SecurityKeyManagementView />)

    fireEvent.click(screen.getByText('system.securityKey.rotateJwt'))
    expect(securityKeyMocks.modalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title:
          'system.securityKey.rotateConfirmTitle:system.securityKey.jwtName',
      }),
    )

    act(() => {
      securityKeyMocks.modalConfirm.mock.calls[0][0].onOk()
    })
    expect(
      screen.getByText('system.securityKey.confirmRotation:JWT'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('confirm-rotation'))

    await waitFor(() => {
      expect(securityKeyMocks.rotateJwtSecurityKey).toHaveBeenCalledWith(
        '123456',
      )
    })
    expect(securityKeyMocks.messageSuccess).toHaveBeenCalledWith(
      'system.securityKey.rotateSuccess:JWT',
    )
    expect(securityKeyMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['security-key'],
    })
    await waitFor(() => {
      expect(screen.queryByTestId('totp-confirm')).toBeNull()
    })
  })

  it('rotates the TOTP key after confirmation', async () => {
    render(<SecurityKeyManagementView />)

    fireEvent.click(screen.getByText('system.securityKey.rotateTotp'))
    expect(securityKeyMocks.modalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title:
          'system.securityKey.rotateConfirmTitle:system.securityKey.totpName',
      }),
    )

    act(() => {
      securityKeyMocks.modalConfirm.mock.calls[0][0].onOk()
    })
    expect(
      screen.getByText('system.securityKey.confirmRotation:TOTP'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('confirm-rotation'))

    await waitFor(() => {
      expect(securityKeyMocks.rotateTotpSecurityKey).toHaveBeenCalledWith(
        '123456',
      )
    })
    expect(securityKeyMocks.messageSuccess).toHaveBeenCalledWith(
      'system.securityKey.rotateSuccess:TOTP',
    )
  })

  it('keeps the modal open when rotation fails with an Error', async () => {
    securityKeyMocks.rotateJwtSecurityKey.mockRejectedValueOnce(
      new Error('rotate failed'),
    )
    render(<SecurityKeyManagementView />)

    fireEvent.click(screen.getByText('system.securityKey.rotateJwt'))
    act(() => {
      securityKeyMocks.modalConfirm.mock.calls[0][0].onOk()
    })
    fireEvent.click(screen.getByText('confirm-rotation'))

    await waitFor(() => {
      expect(securityKeyMocks.messageError).toHaveBeenCalledWith(
        'rotate failed',
      )
    })
    expect(screen.getByTestId('totp-confirm')).toBeInTheDocument()
  })

  it('uses the generic rotation failure message for non-Error rejections', async () => {
    securityKeyMocks.rotateTotpSecurityKey.mockRejectedValueOnce('bad request')
    render(<SecurityKeyManagementView />)

    fireEvent.click(screen.getByText('system.securityKey.rotateTotp'))
    act(() => {
      securityKeyMocks.modalConfirm.mock.calls[0][0].onOk()
    })
    fireEvent.click(screen.getByText('confirm-rotation'))

    await waitFor(() => {
      expect(securityKeyMocks.messageError).toHaveBeenCalledWith(
        'system.securityKey.rotateFailed',
      )
    })
  })

  it('closes the two-factor modal when rotation is cancelled', () => {
    render(<SecurityKeyManagementView />)

    fireEvent.click(screen.getByText('system.securityKey.rotateJwt'))
    act(() => {
      securityKeyMocks.modalConfirm.mock.calls[0][0].onOk()
    })
    expect(screen.getByTestId('totp-confirm')).toBeInTheDocument()

    fireEvent.click(screen.getByText('cancel-rotation'))

    expect(screen.queryByTestId('totp-confirm')).toBeNull()
  })
})
