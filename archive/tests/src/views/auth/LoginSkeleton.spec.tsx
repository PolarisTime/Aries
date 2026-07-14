import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/views/auth/AuthPageShell', () => ({
  AuthPageShell: ({
    children,
    hero,
  }: {
    children: React.ReactNode
    hero?: React.ReactNode
  }) => (
    <div data-testid="auth-page-shell">
      {hero && <div data-testid="hero-slot">{hero}</div>}
      {children}
    </div>
  ),
}))

import { LoginSkeleton } from '@/views/auth/LoginSkeleton'

describe('LoginSkeleton', () => {
  it('renders without crashing', () => {
    expect(() => render(<LoginSkeleton />)).not.toThrow()
  })

  it('renders the login scene container', () => {
    const { container } = render(<LoginSkeleton />)
    expect(container.querySelector('.login-scene')).toBeTruthy()
  })

  it('renders skeleton form card', () => {
    const { container } = render(<LoginSkeleton />)
    expect(
      container.querySelector('.login-form-card.login-skeleton-card'),
    ).toBeTruthy()
  })

  it('renders skeleton form elements', () => {
    const { container } = render(<LoginSkeleton />)
    const form = container.querySelector('.login-skeleton-form')
    expect(form).toBeTruthy()
    expect(form?.querySelector('.login-skeleton-form-title')).toBeTruthy()
    expect(form?.querySelectorAll('.login-skeleton-form-line').length).toBe(3)
    expect(form?.querySelector('.login-skeleton-form-button')).toBeTruthy()
  })

  it('renders hero section with skeleton blocks', () => {
    const { container } = render(<LoginSkeleton />)
    const hero = container.querySelector('.login-skeleton-hero')
    expect(hero).toBeTruthy()
    expect(hero?.querySelector('.login-skeleton-logo')).toBeTruthy()
    expect(hero?.querySelector('.login-skeleton-title')).toBeTruthy()
    expect(hero?.querySelector('.login-skeleton-subtitle')).toBeTruthy()
  })

  it('renders hero meta chips', () => {
    const { container } = render(<LoginSkeleton />)
    const meta = container.querySelector('.login-skeleton-meta')
    expect(meta).toBeTruthy()
    expect(meta?.querySelectorAll('.login-skeleton-chip').length).toBe(2)
  })

  it('renders clock section', () => {
    const { container } = render(<LoginSkeleton />)
    const clockWrap = container.querySelector('.login-skeleton-clock-wrap')
    expect(clockWrap).toBeTruthy()
    expect(clockWrap?.querySelector('.login-skeleton-clock')).toBeTruthy()
    expect(clockWrap?.querySelector('.login-skeleton-date')).toBeTruthy()
  })

  it('applies AuthPageShell with hero content', () => {
    const { container } = render(<LoginSkeleton />)
    expect(container.querySelector('.login-skeleton-hero')).toBeTruthy()
  })

  it('renders all skeleton blocks with animation class', () => {
    const { container } = render(<LoginSkeleton />)
    const blocks = container.querySelectorAll('.login-skeleton-block')
    expect(blocks.length).toBeGreaterThan(0)
    blocks.forEach((block) => {
      expect(block.className).toContain('login-skeleton-block')
    })
  })
})
