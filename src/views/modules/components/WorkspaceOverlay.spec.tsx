import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@ant-design/icons', () => ({
  CloseOutlined: () => <span>CloseOutlined</span>,
}))

vi.mock('@/styles/workspace-overlay.css', () => ({}))

import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'

describe('WorkspaceOverlay', () => {
  const defaultProps = {
    open: true,
    title: 'Test Title',
    onClose: vi.fn(),
    children: <div>Content</div>,
  }

  it('renders when open', () => {
    render(<WorkspaceOverlay {...defaultProps} />)
    expect(screen.getByText('Test Title')).toBeTruthy()
    expect(screen.getByText('Content')).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<WorkspaceOverlay {...defaultProps} open={false} />)
    expect(screen.queryByText('Test Title')).toBeNull()
  })

  it('calls onClose when mask is clicked', () => {
    const onClose = vi.fn()
    render(<WorkspaceOverlay {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('modules.workspace.closeAria'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders footer when provided', () => {
    render(
      <WorkspaceOverlay {...defaultProps} footer={<div>Footer Content</div>} />,
    )
    expect(screen.getByText('Footer Content')).toBeTruthy()
  })
})
