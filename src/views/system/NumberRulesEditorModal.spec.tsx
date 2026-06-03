import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({ children, title, open }: { children: React.ReactNode; title: string; open: boolean }) =>
    open ? (
      <div data-testid="form-modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('antd/es/form', () => {
  const Form = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Form.Item = ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      {label && <span>{label}</span>}
      {children}
    </div>
  )
  Form.useWatch = () => ''
  return { default: Form }
})

vi.mock('antd/es/input', () => {
  const Input = () => <input />
  Input.TextArea = () => <textarea />
  return { default: Input }
})

vi.mock('antd/es/select', () => ({
  default: () => <div>Select</div>,
}))

vi.mock('antd/es/row', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('antd/es/col', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  },
}))

const formInstance = {
  getFieldValue: vi.fn(),
  getFieldsValue: vi.fn(() => ({})),
  setFieldsValue: vi.fn(),
  setFieldValue: vi.fn(),
  resetFields: vi.fn(),
  validateFields: vi.fn(),
}

import { NumberRulesEditorModal } from '@/views/system/NumberRulesEditorModal'

describe('NumberRulesEditorModal', () => {
  it('renders without crashing', () => {
    expect(NumberRulesEditorModal).toBeDefined()
    expect(typeof NumberRulesEditorModal).toBe('function')
  })

  it('renders modal when open with number-rule kind', () => {
    render(
      <NumberRulesEditorModal
        open={true}
        kind="number-rule"
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
    expect(screen.getByText('system.numberRules.editNumberRule')).toBeInTheDocument()
  })

  it('renders modal when open with upload-rule kind', () => {
    render(
      <NumberRulesEditorModal
        open={true}
        kind="upload-rule"
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('system.numberRules.editUploadRule')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <NumberRulesEditorModal
        open={false}
        kind="number-rule"
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
  })

  it('renders number rule form fields', () => {
    render(
      <NumberRulesEditorModal
        open={true}
        kind="number-rule"
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('system.numberRules.settingCode')).toBeInTheDocument()
    expect(screen.getByText('system.numberRules.settingName')).toBeInTheDocument()
    expect(screen.getByText('system.numberRules.prefix')).toBeInTheDocument()
    expect(screen.getByText('system.numberRules.dateRule')).toBeInTheDocument()
  })

  it('renders upload rule form fields', () => {
    render(
      <NumberRulesEditorModal
        open={true}
        kind="upload-rule"
        form={formInstance as never}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('system.numberRules.moduleCode')).toBeInTheDocument()
    expect(screen.getByText('system.numberRules.ruleCode')).toBeInTheDocument()
    expect(screen.getByText('system.numberRules.renamePattern')).toBeInTheDocument()
  })
})
