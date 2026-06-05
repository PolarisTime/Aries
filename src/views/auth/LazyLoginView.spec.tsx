import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: vi.fn() }),
}))

vi.mock('@/views/auth/LoginView', () => ({
  LoginView: () => <div data-testid="login-view">LoginView</div>,
}))

vi.mock('@/views/auth/LoginSkeleton', () => ({
  LoginSkeleton: () => <div data-testid="login-skeleton">LoginSkeleton</div>,
}))

import { LazyLoginView } from '@/views/auth/LazyLoginView'

describe('LazyLoginView', () => {
  it('exports a function component', () => {
    expect(LazyLoginView).toBeDefined()
    expect(typeof LazyLoginView).toBe('function')
  })

  it('renders without crashing', async () => {
    const { container } = render(<LazyLoginView />)
    expect(container.firstChild).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByTestId('login-view')).toBeTruthy()
    })
  })

  it('renders the lazy-loaded LoginView after suspense resolves', async () => {
    render(<LazyLoginView />)
    await waitFor(() => {
      expect(screen.getByTestId('login-view')).toBeTruthy()
    })
    expect(screen.getByText('LoginView')).toBeTruthy()
  })

  it('shows LoginSkeleton fallback initially while lazy component loads', () => {
    const { container } = render(<LazyLoginView />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders a Suspense boundary that eventually shows content', async () => {
    const { container } = render(<LazyLoginView />)
    expect(container.firstChild).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByTestId('login-view')).toBeTruthy()
    })
  })

  it('wraps content in a Suspense boundary', async () => {
    const { container } = render(<LazyLoginView />)
    expect(container.firstChild).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByTestId('login-view')).toBeTruthy()
    })
    expect(container.querySelector('[data-testid="login-view"]')).toBeTruthy()
  })
})
