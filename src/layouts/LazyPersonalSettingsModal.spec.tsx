import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LazyPersonalSettingsModal } from '@/layouts/LazyPersonalSettingsModal'

vi.mock('@/layouts/PersonalSettingsModal', () => ({
  PersonalSettingsModal: (props: any) => (
    <div data-testid="mock-modal">open:{String(props.open)}</div>
  ),
}))

const defaultProps = {
  open: false,
  onClose: vi.fn(),
  onSaveDisplay: vi.fn(),
  onResetDisplay: vi.fn(),
  fontSize: 12,
  onFontSizeChange: vi.fn(),
  layoutMode: 'top' as const,
  onLayoutModeChange: vi.fn(),
  themeMode: 'system' as const,
  onThemeModeChange: vi.fn(),
}

describe('LazyPersonalSettingsModal', () => {
  it('returns null when open is false', () => {
    const { container } = render(
      <LazyPersonalSettingsModal {...defaultProps} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders modal when open is true', async () => {
    render(<LazyPersonalSettingsModal {...defaultProps} open={true} />)
    expect(await screen.findByTestId('mock-modal')).toBeDefined()
  })
})
