import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { CompanySubjectCard } from '@/views/system/CompanySubjectCard'

describe('CompanySubjectCard', () => {
  it('renders without crashing', () => {
    expect(CompanySubjectCard).toBeDefined()
    expect(typeof CompanySubjectCard).toBe('function')
  })

  it('renders the card with content', () => {
    const { container } = render(<CompanySubjectCard canSave={true} />)
    expect(container).toBeInTheDocument()
  })

  it('renders form items', () => {
    const { container } = render(<CompanySubjectCard canSave={true} />)
    expect(container.querySelectorAll('.ant-form-item').length).toBeGreaterThan(
      0,
    )
  })

  it('does not render duplicated descriptions summary', () => {
    const { container } = render(<CompanySubjectCard canSave={true} />)
    expect(container.querySelector('.ant-descriptions')).not.toBeInTheDocument()
  })
})
