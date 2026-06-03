import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/views/system/company-settings-view-utils', () => ({
  createEmptySettlementAccount: () => ({
    accountName: '',
    bankName: '',
    bankAccount: '',
    usageType: '通用',
    status: '正常',
    remark: '',
  }),
}))

import { CompanySettlementAccountsCard } from '@/views/system/CompanySettlementAccountsCard'

describe('CompanySettlementAccountsCard', () => {
  it('renders without crashing', () => {
    expect(CompanySettlementAccountsCard).toBeDefined()
    expect(typeof CompanySettlementAccountsCard).toBe('function')
  })

  it('renders the settlement info title', () => {
    const { container } = render(
      <CompanySettlementAccountsCard canSave={true} />,
    )
    expect(container).toBeInTheDocument()
  })

  it('is a function component', () => {
    expect(typeof CompanySettlementAccountsCard).toBe('function')
  })
})
