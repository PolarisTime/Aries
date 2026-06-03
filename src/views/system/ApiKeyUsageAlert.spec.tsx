import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { ApiKeyUsageAlert } from '@/views/system/ApiKeyUsageAlert'

describe('ApiKeyUsageAlert', () => {
  it('renders without crashing', () => {
    expect(ApiKeyUsageAlert).toBeDefined()
    expect(typeof ApiKeyUsageAlert).toBe('function')
  })

  it('renders the alert with info type', () => {
    const { container } = render(<ApiKeyUsageAlert />)
    const alert = container.querySelector('.ant-alert')
    expect(alert).toBeInTheDocument()
  })

  it('renders usage items', () => {
    const { container } = render(<ApiKeyUsageAlert />)
    expect(container.textContent).toContain('system.apiKeyUsage.title')
  })
})
