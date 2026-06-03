import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('antd/es/dropdown', () => ({
  default: ({ children, menu, ...props }: any) => (
    <div data-testid="dropdown" {...props}>
      {children}
    </div>
  ),
}))

vi.mock('@ant-design/icons', () => ({
  PrinterOutlined: () => <span>PrinterOutlined</span>,
}))

vi.mock('@/api/print-template', () => ({
  listPrintTemplates: vi.fn(),
}))

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetMap: {
    'test-module': 'test-target',
  },
}))

import { PrintTemplateDropdown } from '@/views/modules/components/PrintTemplateDropdown'

describe('PrintTemplateDropdown', () => {
  const defaultProps = {
    moduleKey: 'test-module',
    disabled: false,
    loading: false,
    onPrint: vi.fn(),
  }

  it('renders print button', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)
    expect(screen.getByText('modules.print.print')).toBeTruthy()
  })

  it('renders dropdown', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)
    expect(screen.getByTestId('dropdown')).toBeTruthy()
  })
})
