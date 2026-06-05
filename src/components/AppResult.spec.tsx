import '@/i18n'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppResult } from './AppResult'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

describe('AppResult', () => {
  it('renders a copyable trace id when provided', () => {
    render(
      <AppResult status="error" subTitle="保存失败" traceId="trace-20260602" />,
    )

    expect(screen.getByText('保存失败')).toBeTruthy()
    expect(screen.getByText('Trace ID: trace-20260602')).toBeTruthy()
  })

  it('does not render an empty trace id', () => {
    render(<AppResult status="error" traceId="   " />)

    expect(screen.queryByText(/Trace ID:/)).toBeNull()
  })
})
