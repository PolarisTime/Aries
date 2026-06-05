import { useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, icon, loading: _loading, ...props }: any) => (
    <button {...props}>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('antd/es/dropdown', () => ({
  default: ({ children, menu, ...props }: any) => (
    <div data-testid="dropdown" {...props}>
      {children}
      <div data-testid="menu">
        {(menu?.items || []).map((item: any) => {
          if (item.type === 'group') {
            return (
              <div data-testid="menu-group" key={item.label}>
                <span>{item.label}</span>
                {(item.children || []).map((child: any) => (
                  <button
                    data-testid={`menu-item-${child.key}`}
                    key={child.key}
                    onClick={() => menu.onClick({ key: child.key })}
                    type="button"
                  >
                    {child.icon}
                    {child.label}
                  </button>
                ))}
              </div>
            )
          }
          return (
            <button
              data-disabled={String(item.disabled)}
              data-testid={`menu-item-${item.key}`}
              key={item.key}
              onClick={() => menu.onClick({ key: item.key })}
              type="button"
            >
              {item.label}
            </button>
          )
        })}
      </div>
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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQuery).mockReturnValue({ data: [] } as never)
  })

  it('renders print button', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)
    expect(screen.getByText('modules.print.print')).toBeTruthy()
  })

  it('renders dropdown', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)
    expect(screen.getByTestId('dropdown')).toBeTruthy()
  })

  it('renders disabled no-template menu item when templates are empty', () => {
    render(<PrintTemplateDropdown {...defaultProps} />)

    expect(screen.getByText('modules.print.noTemplate')).toBeTruthy()
    expect(screen.getByTestId('menu-item-no-template')).toHaveAttribute(
      'data-disabled',
      'true',
    )
  })

  it('prints selected template in preview and direct modes', () => {
    const onPrint = vi.fn()
    const template = {
      id: 'tpl-1',
      templateName: '出库单模板',
      targetType: 'test-module',
    }
    vi.mocked(useQuery).mockReturnValue({ data: [template] } as never)

    render(<PrintTemplateDropdown {...defaultProps} onPrint={onPrint} />)

    expect(screen.getByText('出库单模板')).toBeTruthy()
    fireEvent.click(screen.getByTestId('menu-item-preview:tpl-1'))
    fireEvent.click(screen.getByTestId('menu-item-direct:tpl-1'))

    expect(onPrint).toHaveBeenCalledWith(true, template)
    expect(onPrint).toHaveBeenCalledWith(false, template)
  })

  it('disables query for unsupported module key', () => {
    render(
      <PrintTemplateDropdown
        {...defaultProps}
        moduleKey="unsupported-module"
      />,
    )

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queryKey: ['print-templates', 'unsupported-module'],
      }),
    )
  })
})
