import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/views/system/SessionManagementView', () => ({
  SessionManagementView: ({ active }: { active?: boolean }) => (
    <div data-active={String(active)} data-testid="session-management-view" />
  ),
}))

vi.mock('@/views/system/ApiKeyManagementView', () => ({
  ApiKeyManagementView: ({ active }: { active?: boolean }) => (
    <div data-active={String(active)} data-testid="api-key-management-view" />
  ),
}))

vi.mock('@/views/system/SecurityKeyManagementView', () => ({
  SecurityKeyManagementView: ({ active }: { active?: boolean }) => (
    <div
      data-active={String(active)}
      data-testid="security-key-management-view"
    />
  ),
}))

import { SecurityCenterView } from '@/views/system/SecurityCenterView'

describe('SecurityCenterView', () => {
  it('renders merged security tabs', () => {
    render(<SecurityCenterView />)

    expect(
      screen.getByRole('tab', {
        name: 'system.securityCenter.sessionsTab',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'system.securityCenter.apiKeysTab',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'system.securityCenter.securityKeysTab',
      }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('session-management-view')).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('passes active state to the selected tab view', () => {
    render(<SecurityCenterView />)

    fireEvent.click(
      screen.getByRole('tab', {
        name: 'system.securityCenter.apiKeysTab',
      }),
    )

    expect(screen.getByTestId('api-key-management-view')).toHaveAttribute(
      'data-active',
      'true',
    )
  })
})
