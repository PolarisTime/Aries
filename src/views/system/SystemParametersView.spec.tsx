import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/views/system/GeneralSettingsView', () => ({
  GeneralSettingsView: () => <div data-testid="general-settings-view" />,
}))

vi.mock('@/views/system/NumberRulesView', () => ({
  NumberRulesView: () => <div data-testid="number-rules-view" />,
}))

vi.mock('@/views/system/OssSettingsView', () => ({
  OssSettingsView: () => <div data-testid="oss-settings-view" />,
}))

import { SystemParametersView } from '@/views/system/SystemParametersView'

describe('SystemParametersView', () => {
  it('renders merged settings tabs', () => {
    render(<SystemParametersView />)

    expect(
      screen.getByRole('tab', {
        name: 'system.systemParameters.generalTab',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'system.systemParameters.numberRulesTab',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'system.systemParameters.ossTab',
      }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('general-settings-view')).toBeInTheDocument()
  })

  it('switches to number rules tab', () => {
    render(<SystemParametersView />)

    fireEvent.click(
      screen.getByRole('tab', {
        name: 'system.systemParameters.numberRulesTab',
      }),
    )

    expect(screen.getByTestId('number-rules-view')).toBeInTheDocument()
  })

  it('switches to oss settings tab', () => {
    render(<SystemParametersView />)

    fireEvent.click(
      screen.getByRole('tab', {
        name: 'system.systemParameters.ossTab',
      }),
    )

    expect(screen.getByTestId('oss-settings-view')).toBeInTheDocument()
  })
})
