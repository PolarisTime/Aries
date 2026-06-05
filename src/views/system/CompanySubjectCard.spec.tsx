import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/lib/antd-form', () => ({
  getFormString: () => '',
}))

const formInstance = {
  getFieldValue: vi.fn(),
  getFieldsValue: vi.fn(() => ({})),
  setFieldsValue: vi.fn(),
  setFieldValue: vi.fn(),
  resetFields: vi.fn(),
  validateFields: vi.fn(),
  getFieldInstance: vi.fn(),
}

import { CompanySubjectCard } from '@/views/system/CompanySubjectCard'

describe('CompanySubjectCard', () => {
  it('renders without crashing', () => {
    expect(CompanySubjectCard).toBeDefined()
    expect(typeof CompanySubjectCard).toBe('function')
  })

  it('renders the card with content', () => {
    const { container } = render(
      <CompanySubjectCard
        form={formInstance as never}
        canSave={true}
        settlementAccountCount={2}
      />,
    )
    expect(container).toBeInTheDocument()
  })

  it('displays settlement account count', () => {
    const { container } = render(
      <CompanySubjectCard
        form={formInstance as never}
        canSave={true}
        settlementAccountCount={5}
      />,
    )
    expect(container.textContent).toContain('5')
  })

  it('renders form items', () => {
    const { container } = render(
      <CompanySubjectCard
        form={formInstance as never}
        canSave={true}
        settlementAccountCount={0}
      />,
    )
    expect(container.querySelectorAll('.ant-form-item').length).toBeGreaterThan(
      0,
    )
  })

  it('renders descriptions component', () => {
    const { container } = render(
      <CompanySubjectCard
        form={formInstance as never}
        canSave={true}
        settlementAccountCount={0}
      />,
    )
    expect(container.querySelector('.ant-descriptions')).toBeInTheDocument()
  })
})
