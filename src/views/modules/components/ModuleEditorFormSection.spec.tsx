import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { groupFieldsByRow } from '@/module-system/module-field-layout'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('antd/es/button', () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('antd/es/form', () => ({
  default: {
    useFormInstance: () => ({
      getFieldValue: vi.fn(),
      getFieldsValue: vi.fn().mockReturnValue({}),
    }),
    useWatch: () => ({}),
    Item: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

vi.mock('antd/es/col', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/row', () => ({
  default: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Title: ({ children, ...props }: any) => <h5 {...props}>{children}</h5>,
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

vi.mock('antd/es/alert', () => ({
  default: ({ title, ...props }: any) => <div {...props}>{title}</div>,
}))

vi.mock('@/module-system/module-adapter-editor', () => ({
  isEditorFieldDisabledForModule: vi.fn().mockReturnValue(false),
}))

vi.mock('@/module-system/module-field-layout', () => ({
  groupFieldsByRow: vi.fn().mockReturnValue([]),
}))

vi.mock('./EditorFooterActions', () => ({
  EditorFooterActions: () => <div data-testid="footer-actions" />,
}))

vi.mock('./FormFieldRenderer', () => ({
  FormFieldRenderer: () => <div data-testid="form-field" />,
}))

import { ModuleEditorFormSection } from '@/views/modules/components/ModuleEditorFormSection'

describe('ModuleEditorFormSection', () => {
  const defaultProps = {
    config: {
      key: 'test',
      title: 'Test',
      kicker: '',
      description: '',
      filters: [],
      columns: [],
      detailFields: [],
      data: [],
      buildOverview: () => [],
      formFields: [],
    },
    moduleKey: 'test-module',
    canSave: true,
    canAudit: true,
    saving: false,
    showActions: false,
    lineItemsLocked: false,
    lockedLineItemsNotice: '',
    onCancel: vi.fn(),
    onSave: vi.fn(),
  }

  it('renders nothing when no form fields', () => {
    const { container } = render(<ModuleEditorFormSection {...defaultProps} />)
    expect(container.textContent).toBe('')
  })

  it('renders with form fields', () => {
    const config = {
      ...defaultProps.config,
      formFields: [
        {
          key: 'field1',
          label: 'Field 1',
          type: 'text' as const,
          required: false,
        },
      ],
    }
    vi.mocked(groupFieldsByRow).mockReturnValue([
      [{ key: 'field1', label: 'Field 1', type: 'text', required: false }],
    ])
    render(<ModuleEditorFormSection {...defaultProps} config={config} />)
    expect(screen.getByText('modules.editorForm.documentInfo')).toBeTruthy()
  })
})
