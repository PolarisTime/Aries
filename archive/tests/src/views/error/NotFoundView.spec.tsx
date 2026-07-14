import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/AppResult', () => ({
  AppResult: ({
    status,
    showHomeButton,
  }: {
    status: string
    showHomeButton?: boolean
  }) => (
    <div data-testid="app-result">
      <span data-testid="status">{status}</span>
      {showHomeButton && <button>首页</button>}
    </div>
  ),
}))

import { NotFoundView } from '@/views/error/NotFoundView'

describe('NotFoundView', () => {
  it('renders not found view', () => {
    render(<NotFoundView />)
    expect(screen.getByTestId('app-result')).toBeTruthy()
  })

  it('shows 404 status', () => {
    render(<NotFoundView />)
    expect(screen.getByTestId('status').textContent).toBe('404')
  })

  it('shows home button', () => {
    render(<NotFoundView />)
    expect(screen.getByText('首页')).toBeTruthy()
  })

  it('exports NotFoundView component', () => {
    expect(NotFoundView).toBeDefined()
    expect(typeof NotFoundView).toBe('function')
  })
})
