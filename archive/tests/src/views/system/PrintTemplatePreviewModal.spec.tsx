import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/views/system/print-template-view-utils', () => ({
  getPrintTemplateBillTypeLabel: (value: string) => value || '--',
}))

import { PrintTemplatePreviewModal } from '@/views/system/PrintTemplatePreviewModal'

describe('PrintTemplatePreviewModal', () => {
  it('renders without crashing', () => {
    expect(PrintTemplatePreviewModal).toBeDefined()
    expect(typeof PrintTemplatePreviewModal).toBe('function')
  })

  it('renders modal when open with template', () => {
    render(
      <PrintTemplatePreviewModal
        open={true}
        template={
          {
            id: '1',
            templateName: 'Test Template',
            billType: 'PURCHASE_ORDER',
            templateHtml: '<div>test</div>',
          } as never
        }
        onClose={vi.fn()}
      />,
    )
    expect(
      screen.getByText('system.printTemplatePreview.title'),
    ).toBeInTheDocument()
    expect(screen.getByText('Test Template')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const { container } = render(
      <PrintTemplatePreviewModal
        open={false}
        template={null}
        onClose={vi.fn()}
      />,
    )
    expect(container.querySelector('.ant-modal')).not.toBeInTheDocument()
  })

  it('renders template HTML content', () => {
    render(
      <PrintTemplatePreviewModal
        open={true}
        template={
          {
            id: '1',
            templateName: 'Test',
            billType: 'ORDER',
            templateHtml: '<p>Hello</p>',
          } as never
        }
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('<p>Hello</p>')).toBeInTheDocument()
  })

  it('renders empty template message when no HTML', () => {
    render(
      <PrintTemplatePreviewModal
        open={true}
        template={
          {
            id: '1',
            templateName: 'Test',
            billType: 'ORDER',
            templateHtml: '',
          } as never
        }
        onClose={vi.fn()}
      />,
    )
    expect(
      screen.getByText('system.printTemplatePreview.emptyTemplate'),
    ).toBeInTheDocument()
  })
})
